import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate, requireRole } from '../../shared/middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(requireRole(Role.ADMIN));

router.get('/', usersController.list.bind(usersController));
router.get('/:id', usersController.get.bind(usersController));
router.post('/', usersController.create.bind(usersController));
router.put('/:id', usersController.update.bind(usersController));
router.delete('/:id', usersController.remove.bind(usersController));

export default router;
