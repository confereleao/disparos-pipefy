import { Router, Request, Response, NextFunction } from 'express';
import { QueueStatus } from '@prisma/client';
import { historyService } from './history.service';
import { authenticate } from '../../shared/middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await historyService.getDashboardStats();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      status, pipeIntegrationId, automationId, userId, cardId,
      phoneNumber, dateFrom, dateTo, page, limit,
    } = req.query as Record<string, string>;

    const data = await historyService.getLogs({
      status: status as QueueStatus,
      pipeIntegrationId,
      automationId,
      userId,
      cardId,
      phoneNumber,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/audit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, resource, page, limit } = req.query as Record<string, string>;
    const data = await historyService.getAuditLogs(
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
      userId,
      resource,
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export default router;
