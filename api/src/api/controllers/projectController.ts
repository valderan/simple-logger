import { Request, Response } from 'express';
import { z } from 'zod';
import { ProjectModel } from '../models/Project';
import { LogModel } from '../models/Log';
import { buildLogFilter } from '../utils/logFilters';
import { PingServiceModel } from '../models/PingService';
import { defaultPingMonitor } from '../../ping/monitor';

const projectSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  logFormat: z.record(z.any()),
  defaultTags: z.array(z.string()).default(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']),
  customTags: z.array(z.string()).default([]),
  accessLevel: z.enum(['global', 'whitelist', 'docker']).default('global'),
  telegramNotify: z.object({
    enabled: z.boolean().default(false),
    recipients: z.array(z.object({ chatId: z.string(), tags: z.array(z.string()).default([]) })).default([]),
    antiSpamInterval: z.number().min(1).default(15)
  }).default({ enabled: false, recipients: [], antiSpamInterval: 15 }),
  debugMode: z.boolean().default(false)
});

const pingSchema = z.object({
  name: z.string().min(2),
  url: z.string().url(),
  interval: z.number().min(5).max(3600).default(60),
  telegramTags: z.array(z.string()).default([])
});

/**
 * Создает новый проект логирования.
 */
export async function createProject(req: Request, res: Response): Promise<Response> {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Неверный формат данных', details: parsed.error.flatten() });
  }
  const data = parsed.data;
  const project = await ProjectModel.create(data);
  return res.status(201).json(project.toJSON());
}

/**
 * Возвращает список проектов.
 */
export async function listProjects(_req: Request, res: Response): Promise<Response> {
  const projects = await ProjectModel.find().sort({ createdAt: -1 });
  return res.json(projects);
}

/**
 * Возвращает информацию о конкретном проекте.
 */
export async function getProject(req: Request, res: Response): Promise<Response> {
  const { uuid } = req.params;
  const project = await ProjectModel.findOne({ uuid });
  if (!project) {
    return res.status(404).json({ message: 'Проект не найден' });
  }
  return res.json(project);
}

/**
 * Возвращает логи проекта с фильтрами.
 */
export async function getProjectLogs(req: Request, res: Response): Promise<Response> {
  const { uuid } = req.params;
  const project = await ProjectModel.findOne({ uuid });
  if (!project) {
    return res.status(404).json({ message: 'Проект не найден' });
  }
  const filter = buildLogFilter(uuid, req.query as Record<string, string>);
  const logs = await LogModel.find(filter).sort({ timestamp: -1 }).limit(5000);
  return res.json({ project, logs });
}

/**
 * Обновляет параметры проекта, кроме UUID.
 */
export async function updateProject(req: Request, res: Response): Promise<Response> {
  const { uuid } = req.params;

  if (typeof req.body?.uuid === 'string' && req.body.uuid !== uuid) {
    return res.status(400).json({ message: 'UUID проекта нельзя изменять' });
  }

  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Неверный формат данных', details: parsed.error.flatten() });
  }

  const updated = await ProjectModel.findOneAndUpdate({ uuid }, parsed.data, { new: true });
  if (!updated) {
    return res.status(404).json({ message: 'Проект не найден' });
  }

  return res.json(updated.toJSON());
}

/**
 * Удаляет проект и связанные данные.
 */
export async function deleteProject(req: Request, res: Response): Promise<Response> {
  const { uuid } = req.params;

  if (uuid === 'logger-system') {
    return res.status(400).json({ message: 'Нельзя удалить системный проект' });
  }

  const project = await ProjectModel.findOneAndDelete({ uuid });
  if (!project) {
    return res.status(404).json({ message: 'Проект не найден' });
  }

  const [logsResult, pingResult] = await Promise.all([
    LogModel.deleteMany({ projectUuid: uuid }),
    PingServiceModel.deleteMany({ projectUuid: uuid })
  ]);

  return res.json({
    message: 'Проект удален',
    deletedLogs: logsResult.deletedCount ?? 0,
    deletedPingServices: pingResult.deletedCount ?? 0
  });
}

/**
 * Добавляет ping-сервис в проект.
 */
export async function addPingService(req: Request, res: Response): Promise<Response> {
  const { uuid } = req.params;
  const parsed = pingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Неверный формат данных', details: parsed.error.flatten() });
  }
  const project = await ProjectModel.findOne({ uuid });
  if (!project) {
    return res.status(404).json({ message: 'Проект не найден' });
  }
  const service = await PingServiceModel.create({ ...parsed.data, projectUuid: uuid });
  await defaultPingMonitor.checkService(service);
  return res.status(201).json(service.toJSON());
}

/**
 * Возвращает ping-сервисы проекта.
 */
export async function listPingServices(req: Request, res: Response): Promise<Response> {
  const { uuid } = req.params;
  const services = await PingServiceModel.find({ projectUuid: uuid });
  return res.json(services);
}

/**
 * Принудительно запускает проверку всех ping-сервисов проекта.
 */
export async function triggerPingCheck(req: Request, res: Response): Promise<Response> {
  const { uuid } = req.params;
  const services = await defaultPingMonitor.checkProjectServices(uuid);
  return res.json(services);
}
