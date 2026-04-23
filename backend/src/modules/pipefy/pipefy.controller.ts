import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pipefyService } from './pipefy.service';
import { audit } from '../../shared/utils/audit';

const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  pipefyToken: z.string().min(1, 'Token obrigatório'),
  pipeId: z.string().min(1, 'ID do pipe obrigatório'),
  fieldMapping: z.record(z.string()).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  pipefyToken: z.string().min(1).optional(),
  pipeId: z.string().min(1).optional(),
  fieldMapping: z.record(z.string()).optional(),
  active: z.boolean().optional(),
});

export class PipefyController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await pipefyService.getAllIntegrations();
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await pipefyService.getIntegrationById(req.params.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = createSchema.parse(req.body);
      const data = await pipefyService.createIntegration(dto);
      await audit({ req, action: 'CREATE_PIPE_INTEGRATION', resource: 'pipe_integrations', resourceId: data.id });
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = updateSchema.parse(req.body);
      const data = await pipefyService.updateIntegration(req.params.id, dto);
      await audit({ req, action: 'UPDATE_PIPE_INTEGRATION', resource: 'pipe_integrations', resourceId: req.params.id });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await pipefyService.deleteIntegration(req.params.id);
      await audit({ req, action: 'DELETE_PIPE_INTEGRATION', resource: 'pipe_integrations', resourceId: req.params.id });
      res.json({ success: true, message: 'Integração removida' });
    } catch (err) { next(err); }
  }

  async validateToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = z.object({ token: z.string() }).parse(req.body);
      await pipefyService.validateToken(token);
      res.json({ success: true, message: 'Token válido' });
    } catch (err) { next(err); }
  }

  async listPipes(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = z.object({ token: z.string() }).parse(req.query);
      const data = await pipefyService.listPipes(token as string);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async getPhases(req: Request, res: Response, next: NextFunction) {
    try {
      const integration = await pipefyService.getIntegrationById(req.params.id);
      const data = await pipefyService.getPipePhases(integration.pipefyToken, integration.pipeId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async getFields(req: Request, res: Response, next: NextFunction) {
    try {
      const integration = await pipefyService.getIntegrationById(req.params.id);
      const data = await pipefyService.getPipeFields(integration.pipefyToken, integration.pipeId);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async syncCards(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await pipefyService.syncCards(req.params.id);
      await audit({ req, action: 'SYNC_CARDS', resource: 'pipe_integrations', resourceId: req.params.id, details: result });
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  async getCards(req: Request, res: Response, next: NextFunction) {
    try {
      const { phaseId, search } = req.query as { phaseId?: string; search?: string };
      const data = await pipefyService.getCardsCache(req.params.id, phaseId, search);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;
      // Responde imediatamente e processa em background
      res.status(200).json({ received: true });
      await pipefyService.processWebhook(token, req.body);
    } catch (err) { next(err); }
  }
}

export const pipefyController = new PipefyController();
