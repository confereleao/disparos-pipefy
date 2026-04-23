import { Router } from 'express';
import { pipefyController } from './pipefy.controller';
import { authenticate, requireRole } from '../../shared/middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Webhook público (autenticado via token no path)
router.post('/webhook/:token', pipefyController.webhook.bind(pipefyController));

// Rotas autenticadas
router.use(authenticate);

router.get('/', pipefyController.list.bind(pipefyController));
router.get('/pipes', pipefyController.listPipes.bind(pipefyController));
router.get('/:id', pipefyController.get.bind(pipefyController));
router.get('/:id/phases', pipefyController.getPhases.bind(pipefyController));
router.get('/:id/fields', pipefyController.getFields.bind(pipefyController));
router.get('/:id/cards', pipefyController.getCards.bind(pipefyController));
router.post('/:id/sync', pipefyController.syncCards.bind(pipefyController));

// Somente admin pode criar/editar integrações
router.post('/validate-token', requireRole(Role.ADMIN), pipefyController.validateToken.bind(pipefyController));
router.post('/', requireRole(Role.ADMIN), pipefyController.create.bind(pipefyController));
router.put('/:id', requireRole(Role.ADMIN), pipefyController.update.bind(pipefyController));
router.delete('/:id', requireRole(Role.ADMIN), pipefyController.remove.bind(pipefyController));

export default router;
