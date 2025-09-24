import { Request, Response } from 'express';
import { z } from 'zod';
import { WhitelistModel } from '../models/Whitelist';

const whitelistSchema = z.object({
  ip: z.string().min(3),
  description: z.string().optional()
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
