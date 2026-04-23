import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../shared/middlewares/auth.middleware';

const router = Router();

router.post('/login', authController.login.bind(authController));
router.get('/me', authenticate, authController.me.bind(authController));

export default router;
