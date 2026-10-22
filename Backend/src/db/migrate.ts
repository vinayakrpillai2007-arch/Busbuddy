import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pool } from './pool.js';

try {
  const migration = await readFile(resolve(process.cwd(), 'db/migrations/001_initial.sql'), 'utf8');
  await pool.query(migration);
  console.info('Applied migration 001_initial.sql.');
} finally {
  await pool.end();
}