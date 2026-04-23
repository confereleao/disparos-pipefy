import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TemplateCategory } from '@prisma/client';
import { templatesService } from './templates.service';
import { audit } from '../../shared/utils/audit';

const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  category: z.nativeEnum(TemplateCategory).optional(),
  content: z.string().min(1, 'Conteúdo obrigatório'),
});

const updateSchema = createSchema.partial().extend({ active: z.boolean().optional() });

export class TemplatesController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { category } = req.query as { category?: TemplateCategory };
      const data = await templatesService.findAll(category);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await templatesService.findById(req.params.id);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = createSchema.parse(req.body);
      const data = await templatesService.create(dto);
      await audit({ req, action: 'CREATE_TEMPLATE', resource: 'templates', resourceId: data.id });
      res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = updateSchema.parse(req.body);
      const data = await templatesService.update(req.params.id, dto);
      await audit({ req, action: 'UPDATE_TEMPLATE', resource: 'templates', resourceId: req.params.id });
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await templatesService.remove(req.params.id);
      await audit({ req, action: 'DELETE_TEMPLATE', resource: 'templates', resourceId: req.params.id });
      res.json({ success: true, message: 'Template removido' });
    } catch (err) { next(err); }
  }

  async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const { variables } = z.object({ variables: z.record(z.string()).optional() }).parse(req.body);
      const data = await templatesService.preview(req.params.id, variables ?? {});
      res.json({ success: true, data });
    } catch (err) { next(err); }
  }
}

export const templatesController = new TemplatesController();
