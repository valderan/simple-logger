import mongoose, { Document, Schema } from 'mongoose';

export interface SystemSettingsAttributes {
  rateLimitPerMinute: number;
}

export interface SystemSettingsDocument extends SystemSettingsAttributes, Document {
  updatedAt: Date;
  createdAt: Date;
}

const SystemSettingsSchema = new Schema<SystemSettingsDocument>({
  _id: { type: String, default: 'global' },
  rateLimitPerMinute: { type: Number, default: 120, min: 1 }
}, {
  timestamps: true,
  versionKey: false
});

export const SystemSettingsModel = (mongoose.models.SystemSettings as mongoose.Model<SystemSettingsDocument>)
  || mongoose.model<SystemSettingsDocument>('SystemSettings', SystemSettingsSchema);
