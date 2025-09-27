import { Router } from 'express';
import {
  addPingService,
  createProject,
  deletePingService,
  deleteProject,
  getProject,
  getProjectLogs,
  getProjectTelegramInfo,
  listPingServices,
  listProjects,
  triggerPingCheck,
  updatePingService,
  updateProject,
  removeTelegramRecipient
} from '../controllers/projectController';
import { authGuard } from '../middlewares/authGuard';

const router = Router();

router.post('/', authGuard, createProject);
router.get('/', authGuard, listProjects);
router.get('/:uuid/logs', authGuard, getProjectLogs);
router.get('/:uuid', authGuard, getProject);
router.put('/:uuid', authGuard, updateProject);
router.delete('/:uuid', authGuard, deleteProject);
router.post('/:uuid/ping-services', authGuard, addPingService);
router.get('/:uuid/ping-services', authGuard, listPingServices);
router.put('/:uuid/ping-services/:serviceId', authGuard, updatePingService);
router.delete('/:uuid/ping-services/:serviceId', authGuard, deletePingService);
router.post('/:uuid/ping-services/check', authGuard, triggerPingCheck);
router.get('/:uuid/telegram', authGuard, getProjectTelegramInfo);
router.delete('/:uuid/telegram/recipients/:chatId', authGuard, removeTelegramRecipient);

export default router;
