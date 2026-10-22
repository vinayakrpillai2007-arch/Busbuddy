import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
import { env } from '../env.js';

if (!env.bootstrapAdminEmail || !env.bootstrapAdminName || !env.bootstrapAdminPassword) {
  throw new Error('Set BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_NAME and BOOTSTRAP_ADMIN_PASSWORD before bootstrapping.');
}

try {
  const existing = await pool.query('SELECT id FROM users WHERE email = lower($1)', [env.bootstrapAdminEmail]);
  if (existing.rowCount) throw new Error('An account with BOOTSTRAP_ADMIN_EMAIL already exists; bootstrap does not change existing accounts.');
  const hash = await bcrypt.hash(env.bootstrapAdminPassword, 12);
  await pool.query(
    `INSERT INTO users(full_name, email, password_hash, role, account_status)
     VALUES ($1, lower($2), $3, 'admin', 'active')`,
    [env.bootstrapAdminName, env.bootstrapAdminEmail, hash],
  );
  console.info(`Created initial admin account ${env.bootstrapAdminEmail}. Remove bootstrap secrets from the environment after this one-time operation.`);
} finally {
  await pool.end();
}