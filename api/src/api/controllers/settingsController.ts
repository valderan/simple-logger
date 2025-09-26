import { Request, Response } from 'express';
import { z } from 'zod';
import { getRateLimitValue, updateRateLimitValue } from '../services/systemSettings';
import {
  createBlacklistEntry,
  deleteBlacklistEntry,
  listBlacklistEntries,
  updateBlacklistEntry
} from '../services/blacklist';
import { invalidateWhitelistCache } from '../middlewares/ipWhitelist';
import {
  listWhitelistEntries,
  removeWhitelistEntry as removeWhitelistEntryService,
  upsertWhitelistEntry
} from '../services/whitelist';
import { defaultNotifier } from '../../telegram/notifier';

const whitelistSchema = z.object({
  ip: z.string().min(3),
  description: z.string().optional()
});

const rateLimitSchema = z.object({
  rateLimitPerMinute: z.number().min(1).max(100000)
});

const blacklistCreateSchema = z.object({
  ip: z.string().min(3),
  reason: z.string().min(3),
  expiresAt: z.string().datetime().optional().nullable()
});

const blacklistUpdateSchema = z.object({
  ip: z.string().min(3).optional(),
  reason: z.string().min(3).optional(),
  expiresAt: z.string().datetime().optional().nullable()
}).refine((value) => Object.keys(value).length > 0, { message: 'Необходимо указать хотя бы одно поле' });

/**
 * Добавляет IP адрес в белый список.
 */
export async function addWhitelistIp(req: Request, res: Response): Promise<Response> {
  const parsed = whitelistSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Неверные параметры', details: parsed.error.flatten() });
  }
  const record = await upsertWhitelistEntry(parsed.data);
  invalidateWhitelistCache();
  return res.status(201).json(record);
}

/**
 * Удаляет IP из белого списка.
 */
export async function removeWhitelistIp(req: Request, res: Response): Promise<Response> {
  const { ip } = req.params;
  const result = await removeWhitelistEntryService(ip);
  if (result.status === 'protected') {
    return res.status(403).json({ message: 'IP защищён от удаления', code: 'WHITELIST_PROTECTED' });
  }
  if (result.status === 'not_found') {
    return res.status(404).json({ message: 'IP не найден', code: 'WHITELIST_NOT_FOUND' });
  }
  invalidateWhitelistCache();
  return res.json({ success: true });
}

/**
 * Возвращает текущий белый список.
 */
export async function listWhitelist(_req: Request, res: Response): Promise<Response> {
  const ips = await listWhitelistEntries();
  return res.json(ips);
}

/**
 * Возвращает текущий чёрный список.
 */
export async function listBlacklist(_req: Request, res: Response): Promise<Response> {
  const blocks = await listBlacklistEntries();
  return res.json(blocks);
}

/**
 * Добавляет новую блокировку IP.
 */
export async function addBlacklistEntry(req: Request, res: Response): Promise<Response> {
  const parsed = blacklistCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Неверные параметры', details: parsed.error.flatten() });
  }
  try {
    const record = await createBlacklistEntry({
      ip: parsed.data.ip,
      reason: parsed.data.reason,
      expiresAt: parsed.data.expiresAt === undefined ? undefined : parsed.data.expiresAt === null ? null : new Date(parsed.data.expiresAt)
    });
    return res.status(201).json(record);
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) {
      return res.status(409).json({ message: 'IP уже заблокирован' });
    }
    throw error;
  }
}

/**
 * Обновляет существующую блокировку IP.
 */
export async function updateBlacklist(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;
  const parsed = blacklistUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Неверные параметры', details: parsed.error.flatten() });
  }
  try {
    const record = await updateBlacklistEntry(id, {
      ...(parsed.data.ip !== undefined ? { ip: parsed.data.ip } : {}),
      ...(parsed.data.reason !== undefined ? { reason: parsed.data.reason } : {}),
      ...(parsed.data.expiresAt !== undefined
        ? { expiresAt: parsed.data.expiresAt === null ? null : new Date(parsed.data.expiresAt) }
        : {})
    });
    if (!record) {
      return res.status(404).json({ message: 'Блокировка не найдена' });
    }
    return res.json(record);
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) {
      return res.status(409).json({ message: 'IP уже заблокирован' });
    }
    throw error;
  }
}

/**
 * Удаляет блокировку IP.
 */
export async function removeBlacklist(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;
  const record = await deleteBlacklistEntry(id);
  if (!record) {
    return res.status(404).json({ message: 'Блокировка не найдена' });
  }
  return res.json({ success: true });
}

/**
 * Возвращает текущие настройки rate limit.
 */
export async function getRateLimit(_req: Request, res: Response): Promise<Response> {
  const rateLimitPerMinute = await getRateLimitValue();
  return res.json({ rateLimitPerMinute });
}

/**
 * Обновляет настройку rate limit.
 */
export async function updateRateLimit(req: Request, res: Response): Promise<Response> {
  const parsed = rateLimitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Неверные параметры', details: parsed.error.flatten() });
  }

  const updated = await updateRateLimitValue(parsed.data.rateLimitPerMinute);
  return res.json({ rateLimitPerMinute: updated.rateLimitPerMinute });
}

/**
 * Возвращает статус Telegram-бота.
 */
export function getTelegramStatus(_req: Request, res: Response): Response {
  const status = defaultNotifier.getStatus();
  return res.json(status);
}

/**
 * Возвращает URL Telegram-бота и источник данных.
 */
export async function getTelegramBotUrl(_req: Request, res: Response): Promise<Response> {
  const info = await defaultNotifier.getBotUrlInfo();
  return res.json(info);
}
