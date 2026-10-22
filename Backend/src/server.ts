import { app } from './app.js';
import { env } from './env.js';
import { pool } from './db/pool.js';

const server = app.listen(env.port, () => console.info(`College Bus API listening on http://localhost:${env.port}`));

async function shutdown() {
  server.close();
  await pool.end();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());