import { LogMetadata, LogModel } from '../models/Log';

export interface SystemLogOptions {
  level?: string;
  tags?: string[];
  metadata?: LogMetadata;
}

export async function writeSystemLog(message: string, options: SystemLogOptions = {}): Promise<void> {
  const { level = 'INFO', tags = ['SYSTEM'], metadata = {} } = options;

  await LogModel.create({
    projectUuid: 'logger-system',
    level,
    message,
    tags,
    timestamp: new Date(),
    metadata
  });
}
