import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { whatsappService } from './whatsapp.service';
import { audit } from '../../shared/utils/audit';

const createSchema = z.object({
  name: z.string().min(1),
  provider: z.string().default('evolution'),
  apiUrl: z.string().url('URL inválida'),
  apiKey: z.string().min(1),
  instanceName: z.string().optional(),
});

const updateSchema = createSchema.partial().extend({ active: z.boolean().optional() });

const testMessageSchema = z.object({
  phone: z.string().min(8),
  message: z.string().min(1),
});

export class WhatsAppController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await whatsappService.getAllIntegrations();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const integration = await whatsappService.getIntegrationById(req.params.id);
      const { apiKey: _, ...safe } = integration;
      res.json({ success: true, data: safe });
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = createSchema.parse(req.body);
      const data = await whatsappService.createIntegration(dto);
      await audit({ req, action: 'CREATE_WA_INTEGRATION', resource: 'whatsapp_integrations', resourceId: data.id });
      const { apiKey: _, ...safe } = data;
      res.status(201).json({ success: true, data: safe });
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = updateSchema.parse(req.body);
      const data = await whatsappService.updateIntegration(req.params.id, dto);
      await audit({ req, action: 'UPDATE_WA_INTEGRATION', resource: 'whatsapp_integrations', resourceId: req.params.id });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await whatsappService.deleteIntegration(req.params.id);
      await audit({ req, action: 'DELETE_WA_INTEGRATION', resource: 'whatsapp_integrations', resourceId: req.params.id });
      res.json({ success: true, message: 'Integração removida' });
    } catch (err) { next(err); }
  }

  async testConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await whatsappService.testConnection(req.params.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async sendTest(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, message } = testMessageSchema.parse(req.body);
      const data = await whatsappService.sendTestMessage(req.params.id, phone, message);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
}

export const whatsappController = new WhatsAppController();
