import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { QueueStatus } from '@prisma/client';
import { queueService } from './queue.service';
import { audit } from '../../shared/utils/audit';

const manualDispatchSchema = z.object({
  items: z.array(z.object({
    cardId: z.string(),
    cardTitle: z.string().optional(),
    pipeIntegrationId: z.string().uuid(),
    templateId: z.string().uuid(),
    whatsappIntegrationId: z.string().uuid().optional(),
    customPhone: z.string().optional(),
  })).min(1, 'Selecione ao menos um card'),
});

export class QueueController {
  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await queueService.getQueueStats();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, page, limit } = req.query as { status?: QueueStatus; page?: string; limit?: string };
      const data = await queueService.getQueue(status, Number(page ?? 1), Number(limit ?? 50));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await queueService.cancel(req.params.id);
      await audit({ req, action: 'CANCEL_QUEUE_ITEM', resource: 'queue', resourceId: req.params.id });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async retry(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await queueService.retry(req.params.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async retryAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await queueService.retryAll();
      await audit({ req, action: 'RETRY_ALL_ERRORS', resource: 'queue', details: data });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async manualDispatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { items } = manualDispatchSchema.parse(req.body);
      const itemsWithUser = items.map((i) => ({ ...i, userId: req.user!.userId }));
      const result = await queueService.manualDispatch(itemsWithUser);
      await audit({ req, action: 'MANUAL_DISPATCH', resource: 'queue', details: { count: result.queued } });
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  }
}

export const queueController = new QueueController();
