import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  APP_URL: z.string().default('http://localhost:3001'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET deve ter ao menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PIPEFY_API_URL: z.string().default('https://api.pipefy.com/graphql'),
  ADMIN_EMAIL: z.string().email().default('admin@empresa.com'),
  ADMIN_PASSWORD: z.string().default('Admin@123'),
  ADMIN_NAME: z.string().default('Administrador'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  parsed.error.errors.forEach((e) => console.error(`  ${e.path.join('.')}: ${e.message}`));
  process.exit(1);
}

export const env = parsed.data;
