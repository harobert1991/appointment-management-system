import mongoose, { Document, Schema } from 'mongoose';
import { Credentials } from 'google-auth-library';

export interface IToken extends Document {
  userId: string;
  encryptedTokens: string;
  createdAt: Date;
  updatedAt: Date;
}

const TokenSchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  encryptedTokens: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

export const Token = mongoose.model<IToken>('Token', TokenSchema); 