import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { settingsService } from './settings.service';
import { authenticate, requireRole } from '../../shared/middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await settingsService.getAll();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.put('/', requireRole(Role.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updates = z.record(z.string()).parse(req.body);
    await settingsService.setBulk(updates);
    const data = await settingsService.getAll();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.put('/:key', requireRole(Role.ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value } = z.object({ value: z.string() }).parse(req.body);
    const data = await settingsService.set(req.params.key, value);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export default router;
