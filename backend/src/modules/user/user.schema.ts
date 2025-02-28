import mongoose, { Document, Schema } from 'mongoose';

export enum UserRole {
  ADMIN = 'admin',
  PROVIDER = 'provider',
  CLIENT = 'client'
}

// Replace Zod schemas with interfaces
export interface IAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: IAddress;
  role: UserRole;
}

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone?: string;
  address?: IAddress;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// Helper functions for validation
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone: string): boolean {
  return /^\+?[1-9]\d{1,14}$/.test(phone);
}

const userSchema = new Schema<IUser>({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true,
    unique: true,  // Add unique constraint
    sparse: true   // This allows the field to be optional while still maintaining uniqueness
  },
  address: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    postalCode: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true
    }
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.CLIENT
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save middleware to update name
userSchema.pre('save', function(next) {
  const parts = [];
  if (this.firstName) parts.push(this.firstName);
  if (this.lastName) parts.push(this.lastName);
  this.name = parts.join(' ');
  next();
});

// Pre-update middleware to update name
userSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as any;
  if (update.firstName || update.lastName) {
    const firstName = update.firstName || (this as any)._update.$set.firstName;
    const lastName = update.lastName || (this as any)._update.$set.lastName;
    const parts = [];
    if (firstName) parts.push(firstName);
    if (lastName) parts.push(lastName);
    
    if (!update.$set) update.$set = {};
    update.$set.name = parts.join(' ');
  }
  next();
});

export const User = mongoose.model<IUser>('User', userSchema); 