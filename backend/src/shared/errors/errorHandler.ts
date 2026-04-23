import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from './AppError';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
    });
    return;
  }

  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    res.status(422).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Dados inválidos',
      details: err.errors,
    });
    logger.warn(`Validação: ${messages}`);
    return;
  }

  // Erro do Prisma: registro não encontrado
  if ((err as any).code === 'P2025') {
    res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: 'Registro não encontrado',
    });
    return;
  }

  // Erro do Prisma: violação de unique constraint
  if ((err as any).code === 'P2002') {
    res.status(409).json({
      success: false,
      code: 'CONFLICT',
      message: 'Registro duplicado',
    });
    return;
  }

  logger.error('Erro não tratado:', err);
  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'Erro interno do servidor',
  });
}
