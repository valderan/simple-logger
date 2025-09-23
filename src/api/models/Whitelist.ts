import mongoose, { Document, Schema } from 'mongoose';

export interface WhitelistAttributes {
  ip: string;
  description?: string;
}

export interface WhitelistDocument extends WhitelistAttributes, Document {
  createdAt: Date;
}

const WhitelistSchema = new Schema<WhitelistDocument>({
  ip: { type: String, required: true, unique: true },
  description: { type: String }
}, { timestamps: { createdAt: true, updatedAt: false } });

export const WhitelistModel = (mongoose.models.Whitelist as mongoose.Model<WhitelistDocument>) || mongoose.model<WhitelistDocument>('Whitelist', WhitelistSchema);
