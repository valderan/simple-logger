import { Request, Response } from 'express';
import { z } from 'zod';
import { ProjectModel } from '../models/Project';
import { LogModel } from '../models/Log';
import { buildLogFilter } from '../utils/logFilters';
import { defaultNotifier } from '../../telegram/notifier';
import { writeSystemLog } from '../utils/systemLogger';
import { getRateLimitValue } from '../services/systemSettings';

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

function sanitizeIp(ip?: string | null): string {
  if (!ip) {
    return 'unknown';
  }
  return ip.replace(/^::ffff:/, '');
}

function extractClientIp(req: Request): string {
  const header = req.headers['x-forwarded-for'];
  if (typeof header === 'string' && header.trim().length > 0) {
    return sanitizeIp(header.split(',')[0].trim());
  }
  if (Array.isArray(header) && header.length > 0) {
    return sanitizeIp(header[0]);
  }
  if (Array.isArray(req.ips) && req.ips.length > 0) {
    return sanitizeIp(req.ips[0]);
  }
  if (req.socket?.remoteAddress) {
    return sanitizeIp(req.socket.remoteAddress);
  }
  return sanitizeIp(req.ip);
}

/**
 * Принимает лог и сохраняет его в БД.
 */
export async function ingestLog(req: Request, res: Response): Promise<Response> {
  const clientIp = extractClientIp(req);
  const parsed = logSchema.safeParse(req.body);
  if (!parsed.success) {
    const rawUuid = typeof req.body?.uuid === 'string' ? req.body.uuid : undefined;
    if (rawUuid) {
      const project = await ProjectModel.findOne({ uuid: rawUuid });
      if (project) {
        const issues = parsed.error.issues
          .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
          .join('; ');
        await writeSystemLog(`Received malformed log payload for project ${rawUuid}`, {
          level: 'WARNING',
          tags: ['INGEST', 'VALIDATION'],
          metadata: {
            ip: clientIp,
            service: 'log-ingest',
            extra: { issues, projectUuid: rawUuid }
          }
        });
      }
    }
    return res.status(400).json({ message: 'Неверный формат лога', details: parsed.error.flatten() });
  }
  const { uuid, log } = parsed.data;
  const project = await ProjectModel.findOne({ uuid });
  if (!project) {
    await writeSystemLog(`Received log with unknown project UUID: ${uuid}`, {
      level: 'SECURITY',
      tags: ['SECURITY'],
      metadata: { ip: clientIp, service: 'log-ingest', extra: { projectUuid: uuid } }
    });
    return res.status(404).json({ message: 'Проект не найден' });
  }

  const savedLog = await LogModel.create({
    projectUuid: uuid,
    level: log.level,
    message: log.message,
    tags: log.tags,
    timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
    clientIP: clientIp,
    metadata: log.metadata
  });

  if (!project.debugMode && project.telegramNotify.enabled) {
    const tag = log.tags[0] ?? log.level;
    await defaultNotifier.notify(project, `Новый лог [${log.level}] ${log.message}`, tag);
  }

  const rateLimitPerMinute = await getRateLimitValue();

  const responsePayload = savedLog.toJSON();
  return res.status(201).json({ ...responsePayload, rateLimitPerMinute });
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
