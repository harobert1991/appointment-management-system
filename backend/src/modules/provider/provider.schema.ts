import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from '../user/user.schema';

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface ITimeSlot {
  startTime: string;
  endTime: string;
  locationId?: string;
  requiresTravelTime: boolean;
  travelBuffer?: number;
  spansOvernight: boolean;
}

export interface IAvailability {
  dayOfWeek: DayOfWeek;
  timeSlots: ITimeSlot[];
  isRecurring: boolean;
  weeks?: number[];
  conditions?: {
    type: 'fallback' | 'dependent';
    providerId?: string;
    conditionDetails?: string;
  }[];
  specificDates?: {
    date: Date;
    timeSlots: ITimeSlot[];
  }[];
}

export interface IProvider extends Document {
  userId: string;
  servicesOffered: string[];
  availability: IAvailability[];
  exceptions: Date[];
  maxDailyAppointments?: number;
  minBreakBetweenAppointments?: number;
  timezone: string;
  user?: IUser;
}

const timeSlotSchema = new Schema({
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    validate: {
      validator: (v: string) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
      message: 'Start time must be in HH:mm format'
    }
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    validate: {
      validator: (v: string) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
      message: 'End time must be in HH:mm format'
    }
  },
  locationId: {
    type: Schema.Types.ObjectId,
    ref: 'Location'
  },
  requiresTravelTime: {
    type: Boolean,
    default: false
  },
  travelBuffer: {
    type: Number,
    min: [0, 'Travel buffer cannot be negative'],
    required: function(this: ITimeSlot) {
      return this.requiresTravelTime;
    },
    validate: {
      validator: function(this: ITimeSlot, v: number) {
        return !this.requiresTravelTime || (this.requiresTravelTime && v > 0);
      },
      message: 'Travel buffer is required when requiresTravelTime is true'
    }
  },
  spansOvernight: {
    type: Boolean,
    default: false
  }
});

const availabilitySchema = new Schema({
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: [true, 'Day of week is required']
  },
  timeSlots: {
    type: [timeSlotSchema],
    required: [true, 'At least one time slot is required'],
    validate: {
      validator: (slots: ITimeSlot[]) => slots.length > 0,
      message: 'At least one time slot is required'
    }
  },
  isRecurring: {
    type: Boolean,
    default: true
  },
  weeks: [{
    type: Number,
    min: 1,
    max: 53
  }],
  conditions: [{
    type: {
      type: String,
      enum: ['fallback', 'dependent'],
      required: true
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'Provider'
    },
    conditionDetails: String
  }],
  specificDates: [{
    date: {
      type: Date,
      required: true
    },
    timeSlots: [timeSlotSchema]
  }]
});

const providerSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  servicesOffered: [{
    type: Schema.Types.ObjectId,
    ref: 'AppointmentType',
    required: true
  }],
  availability: {
    type: [availabilitySchema],
    required: [true, 'Availability schedule is required']
  },
  exceptions: [{
    type: Date
  }],
  maxDailyAppointments: {
    type: Number,
    min: [1, 'Maximum daily appointments must be at least 1']
  },
  minBreakBetweenAppointments: {
    type: Number,
    min: [0, 'Minimum break cannot be negative']
  },
  timezone: {
    type: String,
    required: false,
    default: process.env.TIMEZONE || 'Europe/Paris',
    validate: {
      validator: (v: string) => {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: v });
          return true;
        } catch (e) {
          return false;
        }
      },
      message: (props: { value: string }) => `${props.value} is not a valid timezone`
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate with user details
providerSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Indexes for common queries
providerSchema.index({ userId: 1 }, { unique: true });
providerSchema.index({ servicesOffered: 1 });
providerSchema.index({ 'availability.dayOfWeek': 1 });

export const Provider = mongoose.model<IProvider>('Provider', providerSchema); 