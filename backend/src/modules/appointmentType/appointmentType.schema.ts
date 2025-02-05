import mongoose, { Document, Schema } from 'mongoose';

export interface IAppointmentType extends Document {
  name: string;
  duration: number;
  description?: string;
  bufferTimeBefore?: number;
  bufferTimeAfter?: number;
  price?: number;
  category?: string;
  isActive: boolean;
  locations?: {
    name: string;
    address?: string;
    type: 'virtual' | 'physical';
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  }[];
  resourcesRequired?: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const appointmentTypeSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  bufferTimeBefore: {
    type: Number,
    min: [0, 'Buffer time cannot be negative']
  },
  bufferTimeAfter: {
    type: Number,
    min: [0, 'Buffer time cannot be negative']
  },
  price: {
    type: Number,
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    required: [true, 'Active status is required'],
    default: true
  },
  locations: [{
    name: {
      type: String,
      required: [true, 'Location name is required']
    },
    address: String,
    type: {
      type: String,
      enum: ['virtual', 'physical'],
      required: [true, 'Location type is required']
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  }],
  resourcesRequired: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for common queries
appointmentTypeSchema.index({ name: 1 });
appointmentTypeSchema.index({ category: 1 });
appointmentTypeSchema.index({ isActive: 1 });
appointmentTypeSchema.index({ tags: 1 });

export const AppointmentType = mongoose.model<IAppointmentType>('AppointmentType', appointmentTypeSchema); 