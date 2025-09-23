import { Router } from 'express';
import { addWhitelistIp, listWhitelist, removeWhitelistIp } from '../controllers/settingsController';
import { authGuard } from '../middlewares/authGuard';

const router = Router();

router.get('/whitelist', authGuard, listWhitelist);
router.post('/whitelist', authGuard, addWhitelistIp);
router.delete('/whitelist/:ip', authGuard, removeWhitelistIp);

export default router;
