import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TriggerType } from '@prisma/client';
import { automationsService } from './automations.service';
import { audit } from '../../shared/utils/audit';

const filterSchema = z.object({
  fieldId: z.string(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'not_empty', 'empty']),
  value: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  pipeIntegrationId: z.string().uuid(),
  phaseId: z.string().optional(),
  phaseName: z.string().optional(),
  triggerType: z.nativeEnum(TriggerType),
  triggerConfig: z.record(z.unknown()).optional(),
  filters: z.array(filterSchema).optional(),
  templateId: z.string().uuid(),
  whatsappIntegrationId: z.string().uuid().optional(),
  delayMinutes: z.number().min(0).default(0),
  allowDuplicate: z.boolean().default(false),
  active: z.boolean().default(true),
});

const updateSchema = createSchema.partial();

export class AutomationsController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { pipeIntegrationId } = req.query as { pipeIntegrationId?: string };
      const data = await automationsService.findAll(pipeIntegrationId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await automationsService.findById(req.params.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = createSchema.parse(req.body);
      const data = await automationsService.create(dto);
      await audit({ req, action: 'CREATE_AUTOMATION', resource: 'automations', resourceId: data.id });
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = updateSchema.parse(req.body);
      const data = await automationsService.update(req.params.id, dto);
      await audit({ req, action: 'UPDATE_AUTOMATION', resource: 'automations', resourceId: req.params.id });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await automationsService.remove(req.params.id);
      await audit({ req, action: 'DELETE_AUTOMATION', resource: 'automations', resourceId: req.params.id });
      res.json({ success: true, message: 'Automação removida' });
    } catch (err) { next(err); }
  }

  async toggle(req: Request, res: Response, next: NextFunction) {
    try {
      const { active } = z.object({ active: z.boolean() }).parse(req.body);
      const data = await automationsService.toggle(req.params.id, active);
      await audit({ req, action: active ? 'ACTIVATE_AUTOMATION' : 'DEACTIVATE_AUTOMATION', resource: 'automations', resourceId: req.params.id });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
}

export const automationsController = new AutomationsController();
