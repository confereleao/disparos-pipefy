import { Router } from 'express';
import { queueController } from './queue.controller';
import { authenticate, requireRole } from '../../shared/middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.get('/stats', queueController.stats.bind(queueController));
router.get('/', queueController.list.bind(queueController));

router.post('/dispatch', requireRole(Role.ADMIN, Role.OPERATOR), queueController.manualDispatch.bind(queueController));
router.post('/retry-all', requireRole(Role.ADMIN, Role.OPERATOR), queueController.retryAll.bind(queueController));
router.patch('/:id/cancel', requireRole(Role.ADMIN, Role.OPERATOR), queueController.cancel.bind(queueController));
router.patch('/:id/retry', requireRole(Role.ADMIN, Role.OPERATOR), queueController.retry.bind(queueController));

export default router;
