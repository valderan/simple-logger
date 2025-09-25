import { Router } from 'express';
import {
  addWhitelistIp,
  getTelegramBotUrl,
  getTelegramStatus,
  getRateLimit,
  listWhitelist,
  removeWhitelistIp,
  updateRateLimit
} from '../controllers/settingsController';
import { authGuard } from '../middlewares/authGuard';

const router = Router();

router.get('/whitelist', authGuard, listWhitelist);
router.post('/whitelist', authGuard, addWhitelistIp);
router.delete('/whitelist/:ip', authGuard, removeWhitelistIp);
router.get('/rate-limit', authGuard, getRateLimit);
router.put('/rate-limit', authGuard, updateRateLimit);
router.get('/telegram-status', authGuard, getTelegramStatus);
router.get('/telegram-url', authGuard, getTelegramBotUrl);

export default router;
