import { Router } from 'express';
import { whatsappController } from './whatsapp.controller';
import { authenticate, requireRole } from '../../shared/middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', whatsappController.list.bind(whatsappController));
router.get('/:id', whatsappController.get.bind(whatsappController));
router.get('/:id/status', whatsappController.testConnection.bind(whatsappController));

router.post('/', requireRole(Role.ADMIN), whatsappController.create.bind(whatsappController));
router.post('/:id/test', whatsappController.sendTest.bind(whatsappController));
router.put('/:id', requireRole(Role.ADMIN), whatsappController.update.bind(whatsappController));
router.delete('/:id', requireRole(Role.ADMIN), whatsappController.remove.bind(whatsappController));

export default router;
