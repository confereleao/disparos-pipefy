import { Router } from 'express';
import { templatesController } from './templates.controller';
import { authenticate, requireRole } from '../../shared/middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.get('/', templatesController.list.bind(templatesController));
router.get('/:id', templatesController.get.bind(templatesController));
router.post('/:id/preview', templatesController.preview.bind(templatesController));

router.post('/', requireRole(Role.ADMIN, Role.OPERATOR), templatesController.create.bind(templatesController));
router.put('/:id', requireRole(Role.ADMIN, Role.OPERATOR), templatesController.update.bind(templatesController));
router.delete('/:id', requireRole(Role.ADMIN), templatesController.remove.bind(templatesController));

export default router;
