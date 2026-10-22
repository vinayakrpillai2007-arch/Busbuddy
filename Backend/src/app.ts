import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env.js';
import authRouter from './routes/auth.js';
import apiRouter from './routes/api.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.frontendOrigin, credentials: false, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
app.use(express.json({ limit: '64kb' }));
app.get('/health', (_request, response) => response.json({ status: 'ok', service: 'college-bus-api' }));
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);
app.use((_request, response) => response.status(404).json({ error: 'Endpoint not found.' }));
app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
    response.status(409).json({ error: 'A record with one of those unique values already exists.' }); return;
  }
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23503') {
    response.status(400).json({ error: 'The request references a record that does not exist.' }); return;
  }
  console.error(error);
  response.status(500).json({ error: 'An unexpected server error occurred.' });
});