import { Request, Response } from 'express';
import { z } from 'zod';
import { ProjectModel } from '../models/Project';
import { LogModel } from '../models/Log';
import { buildLogFilter } from '../utils/logFilters';
import { defaultNotifier } from '../../telegram/notifier';

const logSchema = z.object({
  uuid: z.string(),
  log: z.object({
    level: z.string(),
    message: z.string(),
    tags: z.array(z.string()).default([]),
    timestamp: z.string().optional(),
    metadata: z.object({
      ip: z.string().optional(),
      service: z.string().optional(),
      user: z.string().optional(),
      extra: z.record(z.any()).optional()
    }).default({})
  })
});

/**
 * Принимает лог и сохраняет его в БД.
 */
export async function ingestLog(req: Request, res: Response): Promise<Response> {
  const parsed = logSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Неверный формат лога', details: parsed.error.flatten() });
  }
  const { uuid, log } = parsed.data;
  const project = await ProjectModel.findOne({ uuid });
  if (!project) {
    await LogModel.create({
      projectUuid: 'logger-system',
      level: 'SECURITY',
      message: `Получен лог с неверным UUID: ${uuid}`,
      tags: ['SECURITY'],
      timestamp: new Date(),
      metadata: { ip: req.ip }
    });
    return res.status(404).json({ message: 'Проект не найден' });
  }

  const savedLog = await LogModel.create({
    projectUuid: uuid,
    level: log.level,
    message: log.message,
    tags: log.tags,
    timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
    metadata: log.metadata
  });

  if (!project.debugMode && project.telegramNotify.enabled) {
    const tag = log.tags[0] ?? log.level;
    await defaultNotifier.notify(project, `Новый лог [${log.level}] ${log.message}`, tag);
  }

  return res.status(201).json(savedLog.toJSON());
}

/**
 * Возвращает логи с фильтрами по запросу.
 */
export async function filterLogs(req: Request, res: Response): Promise<Response> {
  const { uuid } = req.query as { uuid?: string };
  if (!uuid) {
    return res.status(400).json({ message: 'Необходимо указать uuid проекта' });
  }
  const project = await ProjectModel.findOne({ uuid });
  if (!project) {
    return res.status(404).json({ message: 'Проект не найден' });
  }
  const filter = buildLogFilter(uuid, req.query as Record<string, string>);
  const logs = await LogModel.find(filter).sort({ timestamp: -1 }).limit(5000);
  return res.json({ project, logs });
}

/**
 * Удаляет логи по заданному фильтру.
 */
export async function deleteLogs(req: Request, res: Response): Promise<Response> {
  const { uuid } = req.params;
  const project = await ProjectModel.findOne({ uuid });
  if (!project) {
    return res.status(404).json({ message: 'Проект не найден' });
  }
  const filter = buildLogFilter(uuid, req.query as Record<string, string>);
  const result = await LogModel.deleteMany(filter);
  return res.json({ deleted: result.deletedCount ?? 0 });
}
