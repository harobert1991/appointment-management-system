import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganization extends Document {
  name?: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    website?: string;
    whatsappBusinessAccountId?: string;
    whatsappPhoneNumberId?: string;
  };
  businessDetails?: {
    taxId?: string;
    registrationNumber?: string;
  };
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const organizationSchema = new Schema({
  name: {
    type: String,
    required: false,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  contact: {
    email: {
      type: String,
      required: false,
      trim: true
    },
    phone: {
      type: String,
      required: false,
      trim: true
    },
    website: {
      type: String,
      trim: true
    },
    whatsappBusinessAccountId: {
      type: String,
      trim: true
    },
    whatsappPhoneNumberId: {
      type: String,
      trim: true
    }
  },
  businessDetails: {
    taxId: String,
    registrationNumber: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Simplified indexes for the updated schema
organizationSchema.index({ name: 1 });

export const Organization = mongoose.model<IOrganization>('Organization', organizationSchema);
