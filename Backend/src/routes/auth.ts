import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { env } from '../env.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const loginSchema = z.object({ email: z.email(), password: z.string().min(1) });
const registrationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email(),
  password: z.string().min(12).max(128),
  studentNumber: z.string().trim().min(2).max(40),
  department: z.string().trim().max(120).optional(),
});

router.post('/register', async (request, response) => {
  const parsed = registrationSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: 'Invalid registration details.', issues: parsed.error.issues }); return; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const inserted = await client.query<{ id: string; email: string; full_name: string; role: 'student'; account_status: 'pending' }>(
      `INSERT INTO users(full_name, email, password_hash, role, account_status)
       VALUES ($1, lower($2), $3, 'student', 'pending')
       RETURNING id, email, full_name, role, account_status`,
      [parsed.data.fullName, parsed.data.email, passwordHash],
    );
    const user = inserted.rows[0];
    await client.query('INSERT INTO students(user_id, student_number, department) VALUES ($1, $2, $3)', [user.id, parsed.data.studentNumber, parsed.data.department ?? null]);
    await client.query('COMMIT');
    response.status(201).json({ user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role, accountStatus: user.account_status }, message: 'Registration submitted for administrator approval.' });
  } catch (error) {
    await client.query('ROLLBACK');
    if (isUniqueViolation(error)) { response.status(409).json({ error: 'Email or student number is already registered.' }); return; }
    throw error;
  } finally { client.release(); }
});

router.post('/login', async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: 'Enter a valid email and password.' }); return; }
  const result = await pool.query<{ id: string; email: string; full_name: string; password_hash: string; role: 'admin' | 'student' | 'driver'; account_status: string }>(
    'SELECT id, email, full_name, password_hash, role, account_status FROM users WHERE email = lower($1)', [parsed.data.email],
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) { response.status(401).json({ error: 'Email or password is incorrect.' }); return; }
  if (user.account_status !== 'active') { response.status(403).json({ error: user.account_status === 'pending' ? 'Your account is awaiting administrator approval.' : 'This account is disabled.' }); return; }
  const token = jwt.sign({ role: user.role, email: user.email }, env.jwtSecret, { subject: user.id, expiresIn: '8h', issuer: 'college-bus-api', audience: 'college-bus-web' });
  response.json({ token, user: { id: user.id, fullName: user.full_name, email: user.email, role: user.role } });
});

router.get('/me', authenticate, async (request, response) => {
  const user = request.user!;
  const result = await pool.query<{ id: string; full_name: string; email: string; role: string; phone: string | null; account_status: string; student_number: string | null; department: string | null }>(
    `SELECT u.id, u.full_name, u.email, u.role, u.phone, u.account_status, s.student_number, s.department
     FROM users u LEFT JOIN students s ON s.user_id = u.id WHERE u.id = $1`, [user.id],
  );
  if (!result.rows[0]) { response.status(404).json({ error: 'Account not found.' }); return; }
  const row = result.rows[0];
  response.json({ id: row.id, fullName: row.full_name, email: row.email, role: row.role, phone: row.phone, accountStatus: row.account_status, studentNumber: row.student_number, department: row.department });
});

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

export default router;