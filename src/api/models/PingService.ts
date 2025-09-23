import mongoose, { Document, Schema } from 'mongoose';

export interface PingServiceAttributes {
  projectUuid: string;
  name: string;
  url: string;
  interval: number;
  lastStatus?: 'ok' | 'degraded' | 'down';
  lastCheckedAt?: Date;
  telegramTags: string[];
}

export interface PingServiceDocument extends PingServiceAttributes, Document {}

const PingServiceSchema = new Schema<PingServiceDocument>({
  projectUuid: { type: String, index: true, required: true },
  name: { type: String, required: true },
  url: { type: String, required: true },
  interval: { type: Number, default: 60 },
  lastStatus: { type: String, enum: ['ok', 'degraded', 'down'], default: 'ok' },
  lastCheckedAt: { type: Date },
  telegramTags: { type: [String], default: [] }
}, { timestamps: true });

export const PingServiceModel = (mongoose.models.PingService as mongoose.Model<PingServiceDocument>) || mongoose.model<PingServiceDocument>('PingService', PingServiceSchema);
