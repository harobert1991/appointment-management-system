import { Schema, model, Document } from 'mongoose';
import { format, toZonedTime } from 'date-fns-tz';

// Get timezone from env or default to Paris
const TIMEZONE = process.env.TIMEZONE || 'Europe/Paris';

export enum EventType {
  APPOINTMENT = 'appointment',
  MEETING = 'meeting',
  REMINDER = 'reminder',
  OTHER = 'other'
}

export interface IEvent extends Document {
  title: string;
  description?: string;
  startDateTime: Date;
  endDateTime: Date;
  location?: string;
  isAllDay: boolean;
  recurrenceRule?: string;
  eventType?: EventType;
  attendees?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>({
  title: { 
    type: String, 
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
    minlength: [1, 'Title cannot be empty']
  },
  description: { 
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  startDateTime: { 
    type: Date, 
    required: [true, 'Start date/time is required'],
    validate: {
      validator: function(value: Date) {
        return value instanceof Date && !isNaN(value.getTime());
      },
      message: 'Invalid start date/time format'
    }
  },
  endDateTime: { 
    type: Date, 
    required: [true, 'End date/time is required'],
    validate: [
      {
        validator: function(value: Date) {
          return value instanceof Date && !isNaN(value.getTime());
        },
        message: 'Invalid end date/time format'
      },
      {
        validator: function(this: IEvent, value: Date) {
          return value >= this.startDateTime;
        },
        message: 'End date/time must be after or equal to start date/time'
      }
    ]
  },
  location: { 
    type: String,
    trim: true,
    maxlength: [500, 'Location cannot exceed 500 characters'],
    validate: {
      validator: function(value: string) {
        // Basic location format validation
        return !value || value.length >= 2;
      },
      message: 'Location must be at least 2 characters long if provided'
    }
  },
  isAllDay: { 
    type: Boolean, 
    default: false,
    validate: {
      validator: function(this: IEvent, isAllDay: boolean) {
        if (!isAllDay) return true;
        
        // If isAllDay is true, verify time components
        const startDate = new Date(this.startDateTime);
        const endDate = new Date(this.endDateTime);
        
        return startDate.getHours() === 0 && 
               startDate.getMinutes() === 0 &&
               endDate.getHours() === 23 &&
               endDate.getMinutes() === 59;
      },
      message: 'All-day events must span entire days (00:00 to 23:59)'
    }
  },
  recurrenceRule: { 
    type: String,
    trim: true,
    validate: {
      validator: function(value: string) {
        if (!value) return true;
        
        // Basic RRULE validation (can be expanded based on needs)
        const rruleRegex = /^FREQ=[A-Z]+;?(UNTIL|COUNT|INTERVAL|BYDAY|BYMONTHDAY|BYMONTH|WKST)=.+$/i;
        return rruleRegex.test(value);
      },
      message: 'Invalid recurrence rule format'
    }
  },
  eventType: { 
    type: String,
    enum: {
      values: Object.values(EventType),
      message: '{VALUE} is not a valid event type'
    },
    default: EventType.OTHER 
  },
  attendees: [{ 
    type: String,
    trim: true,
    validate: {
      validator: function(value: string) {
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      },
      message: 'Invalid email format for attendee'
    }
  }]
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      // Convert UTC dates to Paris timezone
      if (ret.startDateTime) {
        const zonedDate = format(new Date(ret.startDateTime), "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: TIMEZONE });
        ret.startDateTime = zonedDate;
      }
      if (ret.endDateTime) {
        const zonedDate = format(new Date(ret.endDateTime), "yyyy-MM-dd'T'HH:mm:ssXXX", { timeZone: TIMEZONE });
        ret.endDateTime = zonedDate;
      }
      return ret;
    }
  }
});

// Pre-save middleware to convert Paris time to UTC
eventSchema.pre('save', function(next) {
  if (this.startDateTime) {
    this.startDateTime = toZonedTime(this.startDateTime, TIMEZONE);
  }
  if (this.endDateTime) {
    this.endDateTime = toZonedTime(this.endDateTime, TIMEZONE);
  }
  
  if (this.isAllDay) {
    const startDate = toZonedTime(this.startDateTime, TIMEZONE);
    const endDate = toZonedTime(this.endDateTime, TIMEZONE);
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    this.startDateTime = toZonedTime(startDate, TIMEZONE);
    this.endDateTime = toZonedTime(endDate, TIMEZONE);
  }
  
  next();
});

// Indexes for efficient querying
eventSchema.index({ startDateTime: 1, endDateTime: 1 });
eventSchema.index({ eventType: 1 });

export const Event = model<IEvent>('Event', eventSchema); 