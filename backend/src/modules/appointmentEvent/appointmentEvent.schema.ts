import { Schema, model } from 'mongoose';
import { Event, IEvent } from '../../rootModules/event/event.schema';

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show'
}

export enum AppointmentType {
  IN_PERSON = 'in_person',
  VIRTUAL = 'virtual',
  PHONE = 'phone'
}

interface ReminderSetting {
  type: 'email' | 'sms' | 'push';
  timeBeforeEvent: number; // minutes
  isEnabled: boolean;
}

export interface IAppointmentEvent extends IEvent {
  participants: {
    userId: string;
    role: 'provider' | 'client' | 'other';
    name: string;
    email?: string;
    phone?: string;
  }[];
  status: AppointmentStatus;
  appointmentType: AppointmentType;
  providerId?: string;
  clientId?: string;
  reminderSettings?: ReminderSetting[];
  cancellationReason?: {
    reason: string;
    cancelledBy: string;
    cancelledAt: Date;
  };
  additionalNotes?: string;
}

const appointmentEventSchema = new Schema({
  participants: {
    type: [{
      userId: { 
        type: Schema.Types.ObjectId,
        required: [true, 'Participant userId is required'],
        ref: 'User'
      },
      role: { 
        type: String, 
        required: [true, 'Participant role is required'],
        enum: {
          values: ['provider', 'client', 'other'],
          message: '{VALUE} is not a valid participant role'
        }
      },
      name: { 
        type: String, 
        required: [true, 'Participant name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters long']
      },
      email: {
        type: String,
        trim: true,
        validate: {
          validator: function(v: string) {
            return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
          },
          message: 'Invalid email format'
        }
      },
      phone: {
        type: String,
        trim: true,
        validate: {
          validator: function(v: string) {
            return !v || /^\+?[\d\s-]{10,}$/.test(v);
          },
          message: 'Invalid phone number format'
        }
      }
    }],
    validate: [
      {
        validator: function(participants: any[]) {
          return participants && participants.length > 0;
        },
        message: 'At least one participant is required'
      },
      {
        validator: function(participants: any[]) {
          const roles = participants.map(p => p.role);
          return roles.includes('provider') || roles.includes('client');
        },
        message: 'Appointment must have at least one provider or client'
      }
    ]
  },
  status: {
    type: String,
    enum: {
      values: Object.values(AppointmentStatus),
      message: '{VALUE} is not a valid appointment status'
    },
    required: [true, 'Appointment status is required'],
    default: AppointmentStatus.SCHEDULED,
    validate: {
      validator: function(this: IAppointmentEvent, newStatus: AppointmentStatus) {
        if (this.isNew) return true;

        // Status transition rules
        const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
          [AppointmentStatus.SCHEDULED]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
          [AppointmentStatus.CONFIRMED]: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
          [AppointmentStatus.CANCELLED]: [],
          [AppointmentStatus.COMPLETED]: [],
          [AppointmentStatus.NO_SHOW]: []
        };

        const oldStatus = this.status;
        return validTransitions[oldStatus]?.includes(newStatus);
      },
      message: 'Invalid status transition'
    }
  },
  appointmentType: {
    type: String,
    enum: {
      values: Object.values(AppointmentType),
      message: '{VALUE} is not a valid appointment type'
    },
    required: [true, 'Appointment type is required']
  },
  providerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function(this: IAppointmentEvent, v: string) {
        if (!v) return true;
        const User = model('User');
        const exists = await User.exists({ _id: v, role: 'provider' });
        return exists;
      },
      message: 'Provider not found or invalid'
    }
  },
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function(this: IAppointmentEvent, v: string) {
        if (!v) return true;
        const User = model('User');
        const exists = await User.exists({ _id: v });
        return exists;
      },
      message: 'Client not found'
    }
  },
  reminderSettings: [{
    type: {
      type: String,
      enum: {
        values: ['email', 'sms', 'push'],
        message: '{VALUE} is not a valid reminder type'
      },
      required: true
    },
    timeBeforeEvent: {
      type: Number,
      required: true,
      min: [5, 'Reminder must be set at least 5 minutes before event'],
      max: [10080, 'Reminder cannot be set more than 1 week before event']
    },
    isEnabled: {
      type: Boolean,
      default: true
    }
  }],
  cancellationReason: {
    reason: { 
      type: String,
      required: function(this: IAppointmentEvent) {
        return this.status === AppointmentStatus.CANCELLED;
      },
      trim: true,
      minlength: [10, 'Cancellation reason must be at least 10 characters long']
    },
    cancelledBy: { 
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: function(this: IAppointmentEvent) {
        return this.status === AppointmentStatus.CANCELLED;
      }
    },
    cancelledAt: { 
      type: Date,
      default: Date.now
    }
  },
  additionalNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Additional notes cannot exceed 1000 characters']
  }
});

// Pre-save middleware for additional validations
appointmentEventSchema.pre('save', async function(next) {
  // Validate cancellation
  if (this.status === AppointmentStatus.CANCELLED && !this.cancellationReason) {
    throw new Error('Cancellation reason is required when status is cancelled');
  }

  // Ensure reminder times are valid
  if (this.reminderSettings?.length) {
    const now = new Date();
    const eventTime = new Date(this.get('startDateTime'));
    
    for (const reminder of this.reminderSettings) {
      const reminderTime = new Date(eventTime.getTime() - reminder.timeBeforeEvent * 60000);
      if (reminderTime < now) {
        throw new Error('Reminder time cannot be in the past');
      }
    }
  }

  next();
});

// Indexes for common queries
appointmentEventSchema.index({ status: 1 });
appointmentEventSchema.index({ appointmentType: 1 });
appointmentEventSchema.index({ 'participants.userId': 1 });
appointmentEventSchema.index({ providerId: 1, clientId: 1 });

export const AppointmentEvent = Event.discriminator<IAppointmentEvent>(
  'AppointmentEvent',
  appointmentEventSchema
); 