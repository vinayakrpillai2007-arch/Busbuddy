import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import { isRole, type Role } from '../security/roles.js';

export interface AuthenticatedUser { id: string; role: Role; email: string; }

declare global {
  namespace Express {
    interface Request { user?: AuthenticatedUser; }
  }
}

export function authenticate(request: Request, response: Response, next: NextFunction) {
  const token = request.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) { response.status(401).json({ error: 'Authentication required.' }); return; }
  try {
    const decoded = jwt.verify(token, env.jwtSecret, { issuer: 'college-bus-api', audience: 'college-bus-web' });
    if (typeof decoded === 'string' || !decoded.sub || !isRole(decoded.role) || typeof decoded.email !== 'string') {
      response.status(401).json({ error: 'Invalid access token.' }); return;
    }
    request.user = { id: decoded.sub, role: decoded.role, email: decoded.email };
    next();
  } catch {
    response.status(401).json({ error: 'Session expired or invalid.' });
  }
}

export function requireRoles(...roles: Role[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.user) { response.status(401).json({ error: 'Authentication required.' }); return; }
    if (!roles.includes(request.user.role)) { response.status(403).json({ error: 'You do not have permission to perform this action.' }); return; }
    next();
  };
}