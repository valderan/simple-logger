import { NextFunction, Request, Response } from 'express';
import { WhitelistModel } from '../models/Whitelist';

let cachedIps = new Set<string>();
let lastLoaded = 0;
const CACHE_TTL_MS = 60 * 1000;

function normalizeIp(ip: string): string {
  return ip.replace('::ffff:', '');
}

async function refreshCache(): Promise<void> {
  const now = Date.now();
  if (now - lastLoaded < CACHE_TTL_MS) {
    return;
  }
  const records = await WhitelistModel.find();
  cachedIps = new Set(records.map((record) => record.ip));
  lastLoaded = now;
}

/**
 * Middleware, разрешающий доступ на основе белого списка IP.
 */
export async function ipWhitelist(req: Request, res: Response, next: NextFunction): Promise<void> {
  await refreshCache();
  const ip = normalizeIp(req.ip ?? '');
  if (cachedIps.size === 0) {
    return next();
  }
  if (ip === '127.0.0.1' || ip === '::1') {
    return next();
  }
  if (cachedIps.has(ip)) {
    return next();
  }
  res.status(403).json({ message: 'IP не входит в белый список' });
}
