import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './shared/errors/errorHandler';
import { logger } from './shared/utils/logger';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import pipefyRoutes from './modules/pipefy/pipefy.routes';
import whatsappRoutes from './modules/whatsapp/whatsapp.routes';
import automationsRoutes from './modules/automations/automations.routes';
import templatesRoutes from './modules/templates/templates.routes';
import queueRoutes from './modules/queue/queue.routes';
import historyRoutes from './modules/history/history.routes';
import settingsRoutes from './modules/settings/settings.routes';

const app = express();

// ─── Segurança ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL ?? '*',
  credentials: true,
}));

// Rate limit global
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas requisições, tente novamente em instantes' },
}));

// ─── Middlewares ─────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// ─── Rotas ──────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/pipefy', pipefyRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/automations', automationsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/settings', settingsRoutes);

// ─── Error Handler ───────────────────────────────────────────
app.use(errorHandler);

export default app;
