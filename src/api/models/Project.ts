import mongoose, { Document, Model, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface TelegramRecipient {
  /**
   * Идентификатор пользователя telegram.
   */
  chatId: string;
  /**
   * Список тегов, для которых необходимо отправлять уведомления.
   */
  tags: string[];
}

export interface TelegramSettings {
  /**
   * Признак включенного уведомления через telegram.
   */
  enabled: boolean;
  /**
   * Список пользователей для уведомлений.
   */
  recipients: TelegramRecipient[];
  /**
   * Минимальный интервал между повторными уведомлениями в минутах.
   */
  antiSpamInterval: number;
}

export type AccessLevel = 'global' | 'whitelist' | 'docker';

export interface ProjectAttributes {
  uuid: string;
  name: string;
  description?: string;
  logFormat: Record<string, unknown>;
  defaultTags: string[];
  customTags: string[];
  accessLevel: AccessLevel;
  telegramNotify: TelegramSettings;
  debugMode: boolean;
}

export interface ProjectDocument extends ProjectAttributes, Document {
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectModel extends Model<ProjectDocument> {
  /**
   * Создает проект системного логгера при его отсутствии.
   */
  ensureSystemProject(): Promise<ProjectDocument>;
}

const TelegramRecipientSchema = new Schema<TelegramRecipient>({
  chatId: { type: String, required: true },
  tags: { type: [String], default: [] }
}, { _id: false });

const TelegramSettingsSchema = new Schema<TelegramSettings>({
  enabled: { type: Boolean, default: false },
  recipients: { type: [TelegramRecipientSchema], default: [] },
  antiSpamInterval: { type: Number, default: 15 }
}, { _id: false });

const ProjectSchema = new Schema<ProjectDocument, ProjectModel>({
  uuid: { type: String, unique: true, default: uuidv4 },
  name: { type: String, required: true },
  description: { type: String },
  logFormat: { type: Schema.Types.Mixed, required: true },
  defaultTags: { type: [String], default: ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'] },
  customTags: { type: [String], default: [] },
  accessLevel: { type: String, enum: ['global', 'whitelist', 'docker'], default: 'global' },
  telegramNotify: { type: TelegramSettingsSchema, default: () => ({}) },
  debugMode: { type: Boolean, default: false }
}, {
  timestamps: true
});

ProjectSchema.statics.ensureSystemProject = async function ensureSystemProject() {
  const existing = await ProjectModel.findOne({ uuid: 'logger-system' });
  if (existing) {
    return existing;
  }

  return ProjectModel.create({
    uuid: 'logger-system',
    name: 'Logger Core',
    description: 'Системный проект логгера для регистрации внутренних событий.',
    logFormat: {
      timestamp: 'ISO string',
      level: 'INFO|WARNING|ERROR',
      message: 'string'
    },
    accessLevel: 'docker',
    telegramNotify: {
      enabled: false,
      recipients: [],
      antiSpamInterval: 30
    },
    debugMode: true
  });
};

export const ProjectModel = (mongoose.models.Project as ProjectModel) || mongoose.model<ProjectDocument, ProjectModel>('Project', ProjectSchema);
