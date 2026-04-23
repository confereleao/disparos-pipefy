import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { NotFoundError, ConflictError } from '../../shared/errors/AppError';

interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
  active?: boolean;
}

export class UsersService {
  async findAll() {
    return prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, createdAt: true },
    });
    if (!user) throw new NotFoundError('Usuário');
    return user;
  }

  async create(data: CreateUserDto) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictError('Email já cadastrado');

    const hashed = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: { ...data, password: hashed },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    return user;
  }

  async update(id: string, data: UpdateUserDto) {
    await this.findById(id);

    if (data.email) {
      const conflict = await prisma.user.findFirst({
        where: { email: data.email, id: { not: id } },
      });
      if (conflict) throw new ConflictError('Email já em uso');
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, active: true, updatedAt: true },
    });
  }

  async remove(id: string, requesterId: string) {
    if (id === requesterId) throw new ConflictError('Não é possível excluir o próprio usuário');
    await this.findById(id);
    await prisma.user.delete({ where: { id } });
  }
}

export const usersService = new UsersService();
