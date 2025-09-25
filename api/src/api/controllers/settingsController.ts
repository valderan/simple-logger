import { Request, Response } from 'express';
import { z } from 'zod';
import { WhitelistModel } from '../models/Whitelist';
import { getRateLimitValue, updateRateLimitValue } from '../services/systemSettings';
import { defaultNotifier } from '../../telegram/notifier';

const whitelistSchema = z.object({
  ip: z.string().min(3),
  description: z.string().optional()
});

const rateLimitSchema = z.object({
  rateLimitPerMinute: z.number().min(1).max(100000)
});

/**
 * Добавляет IP адрес в белый список.
 */
export async function addWhitelistIp(req: Request, res: Response): Promise<Response> {
  const parsed = whitelistSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Неверные параметры', details: parsed.error.flatten() });
  }
  const record = await WhitelistModel.findOneAndUpdate({ ip: parsed.data.ip }, parsed.data, { upsert: true, new: true });
  return res.status(201).json(record);
}

/**
 * Удаляет IP из белого списка.
 */
export async function removeWhitelistIp(req: Request, res: Response): Promise<Response> {
  const { ip } = req.params;
  const result = await WhitelistModel.findOneAndDelete({ ip });
  if (!result) {
    return res.status(404).json({ message: 'IP не найден' });
  }
  return res.json({ success: true });
}

/**
 * Возвращает текущий белый список.
 */
export async function listWhitelist(_req: Request, res: Response): Promise<Response> {
  const ips = await WhitelistModel.find().sort({ createdAt: -1 });
  return res.json(ips);
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
