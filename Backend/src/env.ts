import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  BOOTSTRAP_ADMIN_EMAIL: z.preprocess(emptyToUndefined, z.email().optional()),
  BOOTSTRAP_ADMIN_NAME: z.preprocess(emptyToUndefined, z.string().min(2).optional()),
  BOOTSTRAP_ADMIN_PASSWORD: z.preprocess(emptyToUndefined, z.string().min(12).optional()),
});

function emptyToUndefined(value: unknown): unknown {
  return typeof value === 'string' && value.trim() === '' ? undefined : value;
}

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid server environment: ${parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
}

export const env = {
  port: parsed.data.PORT,
  databaseUrl: parsed.data.DATABASE_URL,
  jwtSecret: parsed.data.JWT_SECRET,
  frontendOrigin: parsed.data.FRONTEND_ORIGIN,
  bootstrapAdminEmail: parsed.data.BOOTSTRAP_ADMIN_EMAIL,
  bootstrapAdminName: parsed.data.BOOTSTRAP_ADMIN_NAME,
  bootstrapAdminPassword: parsed.data.BOOTSTRAP_ADMIN_PASSWORD,
};