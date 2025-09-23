import { Router } from 'express';
import { addPingService, createProject, getProjectLogs, listPingServices, listProjects, triggerPingCheck } from '../controllers/projectController';
import { authGuard } from '../middlewares/authGuard';

const router = Router();

router.post('/', authGuard, createProject);
router.get('/', authGuard, listProjects);
router.get('/:uuid/logs', authGuard, getProjectLogs);
router.post('/:uuid/ping-services', authGuard, addPingService);
router.get('/:uuid/ping-services', authGuard, listPingServices);
router.post('/:uuid/ping-services/check', authGuard, triggerPingCheck);

export default router;
