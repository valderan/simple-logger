import mongoose, { Document, Schema } from 'mongoose';

export interface LogMetadata {
  /** IP адрес источника лога. */
  ip?: string;
  /** Идентификатор сервиса. */
  service?: string;
  /** Пользователь или сессия. */
  user?: string;
  /** Дополнительные данные. */
  extra?: Record<string, unknown>;
}

export interface LogAttributes {
  projectUuid: string;
  level: string;
  message: string;
  tags: string[];
  timestamp: Date;
  metadata: LogMetadata;
}

export interface LogDocument extends LogAttributes, Document {}

const LogSchema = new Schema<LogDocument>({
  projectUuid: { type: String, index: true, required: true },
  level: { type: String, index: true, required: true },
  message: { type: String, required: true },
  tags: { type: [String], default: [] },
  timestamp: { type: Date, default: () => new Date(), index: true },
  metadata: {
    ip: { type: String },
    service: { type: String },
    user: { type: String },
    extra: { type: Schema.Types.Mixed }
  }
}, { timestamps: false });

export const LogModel = (mongoose.models.Log as mongoose.Model<LogDocument>) || mongoose.model<LogDocument>('Log', LogSchema);
