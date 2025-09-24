import { Router } from 'express';
import {
  addPingService,
  createProject,
  deleteProject,
  getProject,
  getProjectLogs,
  listPingServices,
  listProjects,
  triggerPingCheck,
  updateProject
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
router.post('/:uuid/ping-services/check', authGuard, triggerPingCheck);

export default router;
