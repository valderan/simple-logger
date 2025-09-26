import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import { getRateLimitValue } from '../services/systemSettings';
import { ProjectModel } from '../models/Project';

async function shouldSkipRateLimit(req: Request): Promise<boolean> {
  if ((req as Request & { isWhitelistedIp?: boolean }).isWhitelistedIp) {
    return true;
  }
  if (req.method !== 'POST') {
    return false;
  }
  if (!req.path.startsWith('/api/logs')) {
    return false;
  }
  const projectUuid = typeof req.body?.uuid === 'string' ? req.body.uuid : undefined;
  if (!projectUuid) {
    return false;
  }
  const project = await ProjectModel.findOne({ uuid: projectUuid }).select('accessLevel');
  if (!project) {
    return false;
  }
  return project.accessLevel === 'whitelist' || project.accessLevel === 'docker';
}

/**
 * Базовый анти-DDOS фильтр.
 */
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: async () => getRateLimitValue(),
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit
});
