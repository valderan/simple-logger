import rateLimit from 'express-rate-limit';

/**
 * Базовый анти-DDOS фильтр.
 */
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
