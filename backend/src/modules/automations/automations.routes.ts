import { Router } from 'express';
import { automationsController } from './automations.controller';
import { authenticate, requireRole } from '../../shared/middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.get('/', automationsController.list.bind(automationsController));
router.get('/:id', automationsController.get.bind(automationsController));

router.post('/', requireRole(Role.ADMIN), automationsController.create.bind(automationsController));
router.put('/:id', requireRole(Role.ADMIN), automationsController.update.bind(automationsController));
router.patch('/:id/toggle', requireRole(Role.ADMIN), automationsController.toggle.bind(automationsController));
router.delete('/:id', requireRole(Role.ADMIN), automationsController.remove.bind(automationsController));

export default router;
