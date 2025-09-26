import mongoose, { Document, Schema } from 'mongoose';

export interface BlacklistAttributes {
  ip: string;
  reason: string;
  expiresAt?: Date | null;
}

export interface BlacklistDocument extends BlacklistAttributes, Document {
  createdAt: Date;
  updatedAt: Date;
}

const BlacklistSchema = new Schema<BlacklistDocument>({
  ip: { type: String, required: true, unique: true },
  reason: { type: String, required: true },
  expiresAt: { type: Date, default: null }
}, {
  timestamps: true,
  versionKey: false
});

export const BlacklistModel = (mongoose.models.Blacklist as mongoose.Model<BlacklistDocument>)
  || mongoose.model<BlacklistDocument>('Blacklist', BlacklistSchema);
