import { NextFunction, Request, Response } from 'express';
import { WhitelistModel } from '../models/Whitelist';
import { getAdminIp } from '../services/whitelist';
import { isLoopback, normalizeIp } from '../utils/ipUtils';

declare module 'express-serve-static-core' {
  interface Request {
    isWhitelistedIp?: boolean;
  }
}

let cachedIps = new Set<string>();
let lastLoaded = 0;
const CACHE_TTL_MS = 60 * 1000;

async function refreshCache(): Promise<void> {
  const now = Date.now();
  if (now - lastLoaded < CACHE_TTL_MS) {
    return;
  }
  const records = await WhitelistModel.find().select('ip');
  const normalizedIps = records.map((record) => normalizeIp(record.ip));
  const adminIp = getAdminIp();
  if (adminIp) {
    normalizedIps.push(adminIp);
  }
  cachedIps = new Set(normalizedIps.filter((value) => value));
  lastLoaded = now;
}

/**
 * Middleware, разрешающий доступ на основе белого списка IP.
 */
export async function ipWhitelist(req: Request, _res: Response, next: NextFunction): Promise<void> {
  await refreshCache();
  const ip = normalizeIp(req.ip);
  const isWhitelisted = Boolean(ip) && cachedIps.has(ip);
  req.isWhitelistedIp = isWhitelisted || isLoopback(ip);
  next();
}

export function invalidateWhitelistCache(): void {
  cachedIps = new Set();
  lastLoaded = 0;
}
