import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { usersService } from './users.service';
import { audit } from '../../shared/utils/audit';

const createSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  role: z.nativeEnum(Role).optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(Role).optional(),
  active: z.boolean().optional(),
});

export class UsersController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await usersService.findAll();
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.findById(req.params.id);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createSchema.parse(req.body);
      const user = await usersService.create(data);
      await audit({ req, action: 'CREATE_USER', resource: 'users', resourceId: user.id, details: { email: user.email } });
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateSchema.parse(req.body);
      const user = await usersService.update(req.params.id, data);
      await audit({ req, action: 'UPDATE_USER', resource: 'users', resourceId: req.params.id });
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await usersService.remove(req.params.id, req.user!.userId);
      await audit({ req, action: 'DELETE_USER', resource: 'users', resourceId: req.params.id });
      res.json({ success: true, message: 'Usuário removido' });
    } catch (err) {
      next(err);
    }
  }
}

export const usersController = new UsersController();
