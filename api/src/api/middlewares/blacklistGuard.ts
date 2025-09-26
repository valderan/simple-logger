import { NextFunction, Request, Response } from 'express';
import { findActiveBlock } from '../services/blacklist';
import { normalizeIp } from '../utils/ipUtils';
import { writeSystemLog } from '../utils/systemLogger';

/**
 * Middleware, блокирующий IP-адреса из чёрного списка.
 */
export async function blacklistGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const ip = normalizeIp(req.ip);
  if (!ip) {
    return next();
  }
  const block = await findActiveBlock(ip);
  if (!block) {
    return next();
  }

  await writeSystemLog(`Заблокирован запрос от IP ${ip}`, {
    level: 'SECURITY',
    tags: ['BLACKLIST', 'SECURITY'],
    metadata: {
      ip,
      service: 'blacklist-guard',
      extra: {
        reason: block.reason,
        expiresAt: block.expiresAt ? block.expiresAt.toISOString() : null,
        method: req.method,
        path: req.originalUrl
      }
    }
  });

  res.status(403).json({
    message: 'IP заблокирован',
    reason: block.reason,
    blockedUntil: block.expiresAt ? block.expiresAt.toISOString() : null
  });
}
