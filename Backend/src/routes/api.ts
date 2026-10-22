import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const busSchema = z.object({ busNumber: z.string().trim().min(2).max(24), registrationNumber: z.string().trim().min(3).max(32), capacity: z.number().int().min(1).max(100), routeId: z.uuid().nullable(), assignedDriverId: z.uuid().nullable(), status: z.enum(['active', 'inactive', 'maintenance']) });
const routeSchema = z.object({ name: z.string().trim().min(3).max(100), startPoint: z.string().trim().min(2).max(120), destination: z.string().trim().min(2).max(120), estimatedDurationMinutes: z.number().int().min(1).max(1440), operatingDays: z.array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])).max(7), active: z.boolean().default(true) });
const stopSchema = z.object({ name: z.string().trim().min(2).max(120), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), plannedArrival: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) });
const scheduleSchema = z.object({ busId: z.uuid(), routeId: z.uuid(), departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), arrivalTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), operatingDays: z.array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])).min(1).max(7) });
const holidaySchema = z.object({ title: z.string().trim().min(2).max(180), startDate: z.iso.date(), endDate: z.iso.date(), kind: z.enum(['college_holiday', 'special_event', 'bus_off_day']), description: z.string().trim().min(2).max(2000), busOperationOverride: z.boolean().default(false) });
const notificationSchema = z.object({ title: z.string().trim().min(4).max(180), message: z.string().trim().min(8).max(5000), category: z.enum(['general', 'delay', 'route_change', 'holiday', 'cancellation', 'emergency']), audience: z.enum(['everyone', 'students', 'drivers']), targetBusId: z.uuid().nullable().optional(), targetRouteId: z.uuid().nullable().optional() });
const gpsSchema = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), accuracyMeters: z.number().min(0).max(10000) });
const driverSchema = z.object({ fullName: z.string().trim().min(2).max(120), email: z.email(), phone: z.string().trim().min(7).max(32), licenseNumber: z.string().trim().min(3).max(80), temporaryPassword: z.string().min(12).max(128) });

router.get('/buses', async (request, response) => {
  const user = request.user!;
  const result = await pool.query(
    `SELECT b.id, b.bus_number, b.capacity, b.route_id, b.status, r.name AS route_name,
       CASE WHEN $2 = 'admin' OR $2 = 'driver' THEN b.registration_number ELSE NULL END AS registration_number,
       CASE WHEN $2 = 'admin' OR (s.assigned_bus_id = b.id) THEN d.full_name ELSE NULL END AS driver_name
     FROM buses b LEFT JOIN routes r ON r.id = b.route_id
     LEFT JOIN drivers dr ON dr.id = b.assigned_driver_id LEFT JOIN users d ON d.id = dr.user_id
     LEFT JOIN students s ON s.user_id = $1
     WHERE ($2 = 'admin') OR ($2 = 'student' AND s.assigned_bus_id = b.id) OR ($2 = 'driver' AND dr.user_id = $1)
     ORDER BY b.bus_number`, [user.id, user.role],
  );
  response.json(result.rows);
});

router.post('/buses', requireRoles('admin'), async (request, response) => {
  const parsed = busSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: 'Invalid bus details.', issues: parsed.error.issues }); return; }
  const bus = parsed.data;
  const result = await pool.query(
    `INSERT INTO buses(bus_number, registration_number, capacity, route_id, assigned_driver_id, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [bus.busNumber, bus.registrationNumber, bus.capacity, bus.routeId, bus.assignedDriverId, bus.status],
  );
  response.status(201).json(result.rows[0]);
});

router.patch('/buses/:id', requireRoles('admin'), async (request, response) => {
  const parsed = busSchema.partial().safeParse(request.body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) { response.status(400).json({ error: 'Provide valid bus fields to update.', issues: parsed.success ? [] : parsed.error.issues }); return; }
  const values = parsed.data;
  const mapping: Record<string, string> = { busNumber: 'bus_number', registrationNumber: 'registration_number', capacity: 'capacity', routeId: 'route_id', assignedDriverId: 'assigned_driver_id', status: 'status' };
  const assignments = Object.entries(values).map(([key], index) => `${mapping[key]} = $${index + 2}`);
  const result = await pool.query(`UPDATE buses SET ${assignments.join(', ')}, updated_at = now() WHERE id = $1 RETURNING *`, [request.params.id, ...Object.values(values)]);
  if (!result.rowCount) { response.status(404).json({ error: 'Bus not found.' }); return; }
  response.json(result.rows[0]);
});

router.delete('/buses/:id', requireRoles('admin'), async (request, response) => {
  const result = await pool.query("UPDATE buses SET status = 'inactive', updated_at = now() WHERE id = $1 RETURNING id", [request.params.id]);
  if (!result.rowCount) { response.status(404).json({ error: 'Bus not found.' }); return; }
  response.status(204).end();
});

router.get('/drivers', requireRoles('admin'), async (_request, response) => {
  const result = await pool.query(
    `SELECT d.id, d.user_id, u.full_name, u.email, u.phone, d.license_number, d.availability, b.id AS assigned_bus_id, b.bus_number
     FROM drivers d JOIN users u ON u.id = d.user_id LEFT JOIN buses b ON b.assigned_driver_id = d.id ORDER BY u.full_name`,
  );
  response.json(result.rows);
});

router.post('/drivers', requireRoles('admin'), async (request, response) => {
  const parsed = driverSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: 'Invalid driver profile.', issues: parsed.error.issues }); return; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passwordHash = await bcrypt.hash(parsed.data.temporaryPassword, 12);
    const user = await client.query<{ id: string }>(
      `INSERT INTO users(full_name, email, password_hash, role, phone, account_status)
       VALUES ($1, lower($2), $3, 'driver', $4, 'active') RETURNING id`,
      [parsed.data.fullName, parsed.data.email, passwordHash, parsed.data.phone],
    );
    const driver = await client.query(
      `INSERT INTO drivers(user_id, license_number) VALUES ($1, $2) RETURNING id, user_id, license_number, availability`,
      [user.rows[0].id, parsed.data.licenseNumber],
    );
    await client.query('COMMIT');
    response.status(201).json({ ...driver.rows[0], fullName: parsed.data.fullName, email: parsed.data.email, phone: parsed.data.phone });
  } catch (error) {
    await client.query('ROLLBACK');
    if (isUniqueViolation(error)) { response.status(409).json({ error: 'Email or license number is already registered.' }); return; }
    throw error;
  } finally { client.release(); }
});

router.patch('/drivers/:id/availability', requireRoles('admin'), async (request, response) => {
  const parsed = z.object({ availability: z.enum(['available', 'on_trip', 'unavailable']) }).safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: 'Invalid availability.' }); return; }
  const result = await pool.query('UPDATE drivers SET availability = $2, updated_at = now() WHERE id = $1 RETURNING id, availability', [request.params.id, parsed.data.availability]);
  if (!result.rowCount) { response.status(404).json({ error: 'Driver not found.' }); return; }
  response.json(result.rows[0]);
});

router.get('/routes', async (_request, response) => {
  const routes = await pool.query('SELECT * FROM routes ORDER BY name');
  const stops = await pool.query('SELECT * FROM route_stops ORDER BY route_id, stop_order');
  response.json(routes.rows.map((route) => ({ ...route, stops: stops.rows.filter((stop) => stop.route_id === route.id) })));
});

router.post('/routes', requireRoles('admin'), async (request, response) => {
  const parsed = routeSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: 'Invalid route.', issues: parsed.error.issues }); return; }
  const route = parsed.data;
  const result = await pool.query(
    `INSERT INTO routes(name, start_point, destination, estimated_duration_minutes, operating_days, active)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [route.name, route.startPoint, route.destination, route.estimatedDurationMinutes, route.operatingDays, route.active],
  );
  response.status(201).json(result.rows[0]);
});

router.patch('/routes/:id', requireRoles('admin'), async (request, response) => {
  const parsed = routeSchema.partial().safeParse(request.body);
  if (!parsed.success || !Object.keys(parsed.data ?? {}).length) { response.status(400).json({ error: 'Provide valid route fields to update.', issues: parsed.success ? [] : parsed.error.issues }); return; }
  const mapping: Record<string, string> = { name: 'name', startPoint: 'start_point', destination: 'destination', estimatedDurationMinutes: 'estimated_duration_minutes', operatingDays: 'operating_days', active: 'active' };
  const assignments = Object.keys(parsed.data).map((key, index) => `${mapping[key]} = $${index + 2}`);
  const result = await pool.query(`UPDATE routes SET ${assignments.join(', ')}, updated_at = now() WHERE id = $1 RETURNING *`, [request.params.id, ...Object.values(parsed.data)]);
  if (!result.rowCount) { response.status(404).json({ error: 'Route not found.' }); return; }
  response.json(result.rows[0]);
});

router.post('/routes/:id/stops', requireRoles('admin'), async (request, response) => {
  const parsed = stopSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: 'Invalid stop details.', issues: parsed.error.issues }); return; }
  const result = await pool.query(
    `INSERT INTO route_stops(route_id, name, latitude, longitude, planned_arrival, stop_order)
     SELECT $1, $2, $3, $4, $5, COALESCE(MAX(stop_order) + 1, 0) FROM route_stops WHERE route_id = $1 RETURNING *`,
    [request.params.id, parsed.data.name, parsed.data.latitude, parsed.data.longitude, parsed.data.plannedArrival],
  );
  if (!result.rowCount) { response.status(404).json({ error: 'Route not found.' }); return; }
  response.status(201).json(result.rows[0]);
});

router.delete('/routes/:routeId/stops/:stopId', requireRoles('admin'), async (request, response) => {
  const result = await pool.query('DELETE FROM route_stops WHERE id = $1 AND route_id = $2 RETURNING id', [request.params.stopId, request.params.routeId]);
  if (!result.rowCount) { response.status(404).json({ error: 'Stop not found.' }); return; }
  response.status(204).end();
});

router.get('/schedules', async (request, response) => {
  const result = await pool.query(
    `SELECT sc.* FROM schedules sc JOIN buses b ON b.id = sc.bus_id
     WHERE $2 = 'admin' OR ($2 = 'student' AND EXISTS (SELECT 1 FROM students s WHERE s.user_id = $1 AND s.assigned_bus_id = b.id))
       OR ($2 = 'driver' AND EXISTS (SELECT 1 FROM drivers d WHERE d.user_id = $1 AND b.assigned_driver_id = d.id))
     ORDER BY sc.departure_time`, [request.user!.id, request.user!.role],
  );
  response.json(result.rows);
});

router.post('/schedules', requireRoles('admin'), async (request, response) => {
  const parsed = scheduleSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: 'Invalid schedule.', issues: parsed.error.issues }); return; }
  const schedule = parsed.data;
  if (schedule.arrivalTime <= schedule.departureTime) { response.status(400).json({ error: 'Arrival must be later than departure.' }); return; }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [schedule.busId]);
    const overlap = await client.query(
      `SELECT 1 FROM schedules WHERE bus_id = $1 AND operating_days && $2::text[]
       AND departure_time < $4::time AND arrival_time > $3::time LIMIT 1`,
      [schedule.busId, schedule.operatingDays, schedule.departureTime, schedule.arrivalTime],
    );
    if (overlap.rowCount) { await client.query('ROLLBACK'); response.status(409).json({ error: 'This bus already has an overlapping schedule on one or more selected days.' }); return; }
    const result = await client.query(
      `INSERT INTO schedules(bus_id, route_id, departure_time, arrival_time, operating_days)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [schedule.busId, schedule.routeId, schedule.departureTime, schedule.arrivalTime, schedule.operatingDays],
    );
    await client.query('COMMIT'); response.status(201).json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
});

router.get('/holidays', async (_request, response) => {
  const result = await pool.query('SELECT id, title, start_date, end_date, kind, description, bus_operation_override FROM holidays ORDER BY start_date');
  response.json(result.rows);
});

router.post('/holidays', requireRoles('admin'), async (request, response) => {
  const parsed = holidaySchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: 'Invalid holiday.', issues: parsed.error.issues }); return; }
  if (parsed.data.endDate < parsed.data.startDate) { response.status(400).json({ error: 'End date must be on or after start date.' }); return; }
  const result = await pool.query(
    `INSERT INTO holidays(title, start_date, end_date, kind, description, bus_operation_override, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [parsed.data.title, parsed.data.startDate, parsed.data.endDate, parsed.data.kind, parsed.data.description, parsed.data.busOperationOverride, request.user!.id],
  );
  response.status(201).json(result.rows[0]);
});

router.get('/notifications', async (request, response) => {
  const user = request.user!;
  const audience = user.role === 'admin' ? 'admin' : `${user.role}s`;
  const result = await pool.query(
    `SELECT n.* FROM notifications n
     WHERE n.archived = false AND ($2 = 'admin' OR n.audience IN ('everyone', $2))
       AND (n.target_bus_id IS NULL OR $2 = 'admin' OR EXISTS (
         SELECT 1 FROM students s WHERE s.user_id = $1 AND s.assigned_bus_id = n.target_bus_id
         UNION ALL SELECT 1 FROM drivers d JOIN buses b ON b.assigned_driver_id = d.id WHERE d.user_id = $1 AND b.id = n.target_bus_id))
       AND (n.target_route_id IS NULL OR $2 = 'admin' OR EXISTS (
         SELECT 1 FROM students s WHERE s.user_id = $1 AND s.assigned_route_id = n.target_route_id
         UNION ALL SELECT 1 FROM drivers d JOIN buses b ON b.assigned_driver_id = d.id WHERE d.user_id = $1 AND b.route_id = n.target_route_id))
     ORDER BY n.created_at DESC`, [user.id, audience],
  );
  response.json(result.rows);
});

router.post('/notifications', requireRoles('admin'), async (request, response) => {
  const parsed = notificationSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: 'Invalid notification.', issues: parsed.error.issues }); return; }
  const notice = parsed.data;
  const result = await pool.query(
    `INSERT INTO notifications(title, message, category, audience, target_bus_id, target_route_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [notice.title, notice.message, notice.category, notice.audience, notice.targetBusId ?? null, notice.targetRouteId ?? null, request.user!.id],
  );
  response.status(201).json(result.rows[0]);
});

router.patch('/notifications/:id/archive', requireRoles('admin'), async (request, response) => {
  const result = await pool.query('UPDATE notifications SET archived = true WHERE id = $1 RETURNING id', [request.params.id]);
  if (!result.rowCount) { response.status(404).json({ error: 'Notification not found.' }); return; }
  response.status(204).end();
});

router.get('/trips', async (request, response) => {
  const user = request.user!;
  const result = await pool.query(
    `SELECT t.id, t.bus_id, b.bus_number, t.driver_id, u.full_name AS driver_name,
       t.route_id, r.name AS route_name, t.start_time, t.end_time, t.status, t.source
     FROM trips t JOIN buses b ON b.id = t.bus_id JOIN drivers d ON d.id = t.driver_id
     JOIN users u ON u.id = d.user_id JOIN routes r ON r.id = t.route_id
     WHERE $2 = 'admin' OR d.user_id = $1 OR EXISTS (
       SELECT 1 FROM students s WHERE s.user_id = $1 AND s.assigned_bus_id = t.bus_id)
     ORDER BY t.start_time DESC LIMIT 500`, [user.id, user.role],
  );
  response.json(result.rows);
});

router.get('/buses/:id/locations/latest', async (request, response) => {
  const user = request.user!;
  const result = await pool.query(
    `SELECT gl.bus_id, gl.driver_id, gl.trip_id, gl.latitude, gl.longitude,
       gl.accuracy_meters, gl.source, gl.recorded_at
     FROM gps_locations gl
     WHERE gl.bus_id = $1 AND ($3 = 'admin'
       OR EXISTS (SELECT 1 FROM students s WHERE s.user_id = $2 AND s.assigned_bus_id = gl.bus_id)
       OR EXISTS (SELECT 1 FROM drivers d WHERE d.user_id = $2 AND d.id = gl.driver_id))
     ORDER BY gl.recorded_at DESC LIMIT 1`, [request.params.id, user.id, user.role],
  );
  if (!result.rowCount) { response.status(404).json({ error: 'No accessible location is available for this bus.' }); return; }
  response.json(result.rows[0]);
});

router.get('/students/me', requireRoles('student'), async (request, response) => {
  const result = await pool.query(
    `SELECT u.id, u.full_name, u.email, u.phone, s.student_number, s.department,
       b.id AS bus_id, b.bus_number, r.id AS route_id, r.name AS route_name
     FROM users u JOIN students s ON s.user_id = u.id
     LEFT JOIN buses b ON b.id = s.assigned_bus_id LEFT JOIN routes r ON r.id = s.assigned_route_id
     WHERE u.id = $1`, [request.user!.id],
  );
  if (!result.rowCount) { response.status(404).json({ error: 'Student profile not found.' }); return; }
  response.json(result.rows[0]);
});

router.get('/students', requireRoles('admin'), async (_request, response) => {
  const result = await pool.query(
    `SELECT u.id, u.full_name, u.email, s.student_number, s.department, s.assigned_bus_id, s.assigned_route_id
     FROM students s JOIN users u ON u.id = s.user_id ORDER BY u.full_name`,
  );
  response.json(result.rows);
});

router.patch('/students/:id/status', requireRoles('admin'), async (request, response) => {
  const parsed = z.object({ accountStatus: z.enum(['pending', 'active', 'disabled']) }).safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: 'Invalid account status.' }); return; }
  const result = await pool.query(
    `UPDATE users SET account_status = $2, updated_at = now()
     WHERE id = $1 AND role = 'student' RETURNING id, account_status`,
    [request.params.id, parsed.data.accountStatus],
  );
  if (!result.rowCount) { response.status(404).json({ error: 'Student account not found.' }); return; }
  response.json(result.rows[0]);
});

router.patch('/students/:id/assignment', requireRoles('admin'), async (request, response) => {
  const parsed = z.object({ busId: z.uuid().nullable(), routeId: z.uuid().nullable() }).safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: 'Invalid assignment.', issues: parsed.error.issues }); return; }
  const result = await pool.query('UPDATE students SET assigned_bus_id = $2, assigned_route_id = $3 WHERE user_id = $1 RETURNING user_id, assigned_bus_id, assigned_route_id', [request.params.id, parsed.data.busId, parsed.data.routeId]);
  if (!result.rowCount) { response.status(404).json({ error: 'Student not found.' }); return; }
  response.json(result.rows[0]);
});

router.post('/trips', requireRoles('driver'), async (request, response) => {
  const parsed = z.object({ busId: z.uuid() }).safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: 'A valid assigned bus is required.' }); return; }
  const result = await pool.query(
    `INSERT INTO trips(bus_id, driver_id, route_id, source)
     SELECT b.id, d.id, b.route_id, 'gps' FROM buses b JOIN drivers d ON d.id = b.assigned_driver_id
     WHERE b.id = $1 AND d.user_id = $2 AND b.status = 'active' AND b.route_id IS NOT NULL RETURNING *`,
    [parsed.data.busId, request.user!.id],
  );
  if (!result.rowCount) { response.status(403).json({ error: 'This bus is not active and assigned to the authenticated driver.' }); return; }
  await pool.query("UPDATE drivers SET availability = 'on_trip', updated_at = now() WHERE id = $1", [result.rows[0].driver_id]);
  response.status(201).json(result.rows[0]);
});

router.post('/trips/:id/locations', requireRoles('driver'), async (request, response) => {
  const parsed = gpsSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: 'Invalid location reading.', issues: parsed.error.issues }); return; }
  const result = await pool.query(
    `INSERT INTO gps_locations(bus_id, driver_id, trip_id, latitude, longitude, accuracy_meters, source)
     SELECT t.bus_id, d.id, t.id, $3, $4, $5, 'gps'
     FROM trips t JOIN drivers d ON d.id = t.driver_id JOIN buses b ON b.id = t.bus_id
     WHERE t.id = $1 AND d.user_id = $2 AND d.id = b.assigned_driver_id AND t.end_time IS NULL AND t.status NOT IN ('completed', 'cancelled')
     RETURNING id, bus_id, driver_id, trip_id, latitude, longitude, accuracy_meters, source, recorded_at`,
    [request.params.id, request.user!.id, parsed.data.latitude, parsed.data.longitude, parsed.data.accuracyMeters],
  );
  if (!result.rowCount) { response.status(403).json({ error: 'Location can only be sent for your assigned active trip.' }); return; }
  response.status(201).json(result.rows[0]);
});

router.patch('/trips/:id/status', requireRoles('driver', 'admin'), async (request, response) => {
  const parsed = z.object({ status: z.enum(['on_time', 'delayed', 'completed', 'cancelled']), message: z.string().trim().max(2000).optional() }).safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: 'Invalid trip status.', issues: parsed.error.issues }); return; }
  const isAdmin = request.user!.role === 'admin';
  const result = await pool.query(
    `UPDATE trips t SET status = $3,
       end_time = CASE WHEN $3 IN ('completed', 'cancelled') THEN now() ELSE NULL END
     WHERE t.id = $1 AND (t.end_time IS NULL OR $3 IN ('completed', 'cancelled'))
       AND ($4::boolean OR EXISTS (SELECT 1 FROM drivers d WHERE d.id = t.driver_id AND d.user_id = $2))
     RETURNING t.id, t.bus_id, t.driver_id, t.route_id, t.status, t.end_time`,
    [request.params.id, request.user!.id, parsed.data.status, isAdmin],
  );
  if (!result.rowCount) { response.status(404).json({ error: 'Active trip not found or not assigned to this driver.' }); return; }
  const trip = result.rows[0];
  if (trip.status === 'delayed') {
    await pool.query(
      `INSERT INTO notifications(title, message, category, audience, target_bus_id, target_route_id, created_by)
       SELECT $1, $2, 'delay', 'everyone', $3, $4, $5`,
      [`Bus delay reported`, parsed.data.message || 'The driver reported a delay.', trip.bus_id, trip.route_id, request.user!.id],
    );
  }
  if (trip.status === 'completed' || trip.status === 'cancelled') {
    await pool.query("UPDATE drivers SET availability = 'available', updated_at = now() WHERE id = $1", [trip.driver_id]);
  }
  response.json(trip);
});

router.patch('/trips/:id/end', requireRoles('driver'), async (request, response) => {
  const result = await pool.query(
    `UPDATE trips t SET end_time = now(), status = 'completed'
     FROM drivers d WHERE t.driver_id = d.id AND d.user_id = $2 AND t.id = $1 AND t.end_time IS NULL RETURNING t.*`,
    [request.params.id, request.user!.id],
  );
  if (!result.rowCount) { response.status(404).json({ error: 'Active assigned trip not found.' }); return; }
  response.json(result.rows[0]);
});

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

export default router;