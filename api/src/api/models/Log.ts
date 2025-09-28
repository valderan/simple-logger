import mongoose, { Document, Schema } from 'mongoose';

export interface LogMetadata {
  /** IP адрес источника лога. */
  ip?: string;
  /** Идентификатор сервиса. */
  service?: string;
  /** Пользователь или сессия. */
  user?: string;
  /** Идентификатор чата Telegram, связанный с событием. */
  chatId?: string;
  /** Идентификатор пользователя Telegram, инициировавшего событие. */
  userId?: string;
  /** UUID проекта, к которому относится системный лог. */
  projectUuid?: string;
  /** Список подписок пользователя Telegram, если их несколько. */
  projectSubscriptions?: string[];
  /** Дополнительные данные. */
  extra?: Record<string, unknown>;
  /** Позволяет хранить дополнительные произвольные поля. */
  [key: string]: unknown;
}

export interface LogAttributes {
  projectUuid: string;
  level: string;
  message: string;
  tags: string[];
  timestamp: Date;
  /** IP-адрес клиента, с которого поступил запрос на приём лога. */
  clientIP?: string;
  metadata: LogMetadata;
}

export interface LogDocument extends LogAttributes, Document {}

const LogSchema = new Schema<LogDocument>({
  projectUuid: { type: String, index: true, required: true },
  level: { type: String, index: true, required: true },
  message: { type: String, required: true },
  tags: { type: [String], default: [] },
  timestamp: { type: Date, default: () => new Date(), index: true },
  clientIP: { type: String },
  metadata: {
    ip: { type: String },
    service: { type: String },
    user: { type: String },
    chatId: { type: String },
    userId: { type: String },
    projectUuid: { type: String },
    projectSubscriptions: { type: [String] },
    extra: { type: Schema.Types.Mixed }
  }
}, { timestamps: false });

export const LogModel = (mongoose.models.Log as mongoose.Model<LogDocument>) || mongoose.model<LogDocument>('Log', LogSchema);
