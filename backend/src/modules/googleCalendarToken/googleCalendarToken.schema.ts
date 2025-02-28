import mongoose, { Document, Schema } from 'mongoose';

export interface IToken extends Document {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  scope: string;
  tokenType: string;
  createdAt: Date;
  updatedAt: Date;
}

const TokenSchema = new Schema({
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  expiryDate: {
    type: Number,
    required: true
  },
  scope: {
    type: String,
    required: true
  },
  tokenType: {
    type: String,
    default: 'Bearer'
  }
}, {
  timestamps: true
});

export const Token = mongoose.model<IToken>('Token', TokenSchema); 