import { Router } from 'express';
import { deleteLogs, filterLogs, ingestLog } from '../controllers/logController';
import { authGuard } from '../middlewares/authGuard';

const router = Router();

router.post('/', ingestLog);
router.get('/', authGuard, filterLogs);
router.delete('/:uuid', authGuard, deleteLogs);

export default router;
