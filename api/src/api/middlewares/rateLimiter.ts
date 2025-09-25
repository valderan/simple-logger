import rateLimit from 'express-rate-limit';
import { getRateLimitValue } from '../services/systemSettings';

/**
 * Базовый анти-DDOS фильтр.
 */
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: async () => getRateLimitValue(),
  standardHeaders: true,
  legacyHeaders: false
});
