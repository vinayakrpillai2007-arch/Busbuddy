# College Bus Tracking System

A responsive campus transportation dashboard for students, drivers, and transport administrators. The frontend currently runs in clearly labelled local demo mode and persists its seeded sample dataset in browser `localStorage`. A separate PostgreSQL API package is included as the next persistence phase.

## Problem And Objectives

Campus transport information is often split between printed schedules, messages, and manual fleet records. This project brings bus assignments, service notices, routes, schedules, driver actions, and map visibility into one small demonstration system.

Objectives:

- Make fleet and route information easy to scan and maintain.
- Show student assignment and service notices without inventing live location or ETA values.
- Demonstrate driver trip controls and browser GPS permission behavior.
- Keep the local presentation usable without cloud credentials.
- Provide a PostgreSQL schema and role-protected API as the next persistence step.

## Features

- Responsive React dashboard with role-specific navigation for Admin, Student, and Driver demo views.
- Idempotent demo seed in `Frontend/src/data/demoData.ts`, stored locally by `Frontend/src/services/demoStore.ts`.
- Bus and driver profile management, searchable student directory, route and stop editing, weekday schedules, holiday exceptions, and targeted notices.
- Leaflet/OpenStreetMap routes and stops with sample coordinates explicitly labelled as sample geometry.
- Demo-only simulated movement, a pause/reset control, GPS freshness status, and browser geolocation after the driver explicitly starts sharing.
- Recharts summaries and CSV trip export.
- PostgreSQL migrations, Express API, password hashing, student-only public registration, JWT role checks, admin bootstrap, schedule overlap locking, active trip uniqueness, and assigned-driver GPS validation.

The app does not claim that demo data is real GPS. ETA is shown as unavailable because the sample data has no reliable speed or travel-time model.

## Technology

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, React Router, React Leaflet/Leaflet, Recharts, React Hook Form dependency set, Zod, Sonner, Lucide, date-fns.
- API: Node.js, TypeScript, Express, PostgreSQL, `pg`, Zod, bcrypt, JWT, Helmet, and CORS.
- Local demonstration storage: browser `localStorage` only.

## Architecture

```text
Frontend/                 React/Vite dashboard; local demo storage is the current active adapter
  src/components/         Leaflet map and ordered-stop manager
  src/data/               Linked sample routes, stops, buses, drivers, schedules, and notices
  src/pages/               Overview, tracking, fleet, driver, operations, reports, notices
  src/services/            Demo persistence
  src/utils/               GPS, holiday, schedule, report rules and tests
Backend/                  Separate PostgreSQL API package
  db/migrations/           Relational schema and constraints
  src/routes/               Authentication and role-protected API endpoints
  src/db/                   PostgreSQL pool, migration, and secure admin bootstrap
docker-compose.yml         Local PostgreSQL 16 service
```

### Database Model

The SQL migration creates `users`, `students`, `drivers`, `buses`, `routes`, `route_stops`, `schedules`, `holidays`, `trips`, `gps_locations`, `notifications`, and `notification_reads`. UUIDs identify domain entities; GPS history is append-only, separately indexed by bus/trip and timestamp. Database constraints enforce unique email/student/license/bus/registration values, valid coordinates and capacities, valid status values, and one open trip per bus.

PostgreSQL does not provide a simple unique constraint over arbitrary overlapping time ranges plus arrays of operating days. Schedule creation takes a transaction-scoped advisory lock per bus and checks day overlap and time overlap inside the transaction. All client values are parameterized; only update-column names from validated schemas are interpolated.

## Roles And Security

- Public registration creates only a `student` in `pending` state. It cannot select Admin or Driver.
- Login is denied until an administrator activates pending students with `PATCH /api/students/:id/status`.
- The first admin is created by a one-time environment-driven bootstrap command; no privileged demo password is shipped.
- Driver profiles and accounts are created through the admin-only API, not public registration.
- Admin APIs require a signed JWT with an `admin` role. Student profile reads are scoped to the authenticated user.
- Driver trips are created only for a bus assigned to the authenticated driver. GPS writes must reference that driver’s active trip and assigned bus; server time is used for the database timestamp.
- The frontend role switch is only a local presentation aid. It is not authentication or a security boundary. The local demo must not contain production/private data.
- PostgreSQL must remain private behind the API. Configure TLS, a strong `JWT_SECRET`, database backups, API rate limiting, and HTTPS before deployment. The sample API does not include email-based password reset or production rate limiting.

## Run The Local Demo

Prerequisites: Node.js 20.19+ or 22.12+, and npm.

```powershell
cd Frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). No login password or external credentials are needed for the local presentation. Use the profile menu to switch between clearly labelled Admin, Student, and Driver demo views. Use **Reset demo data** to restore the seed; this is available only in the local frontend and asks for confirmation.

## Run The PostgreSQL API

Prerequisites: Node.js 20.19+ or 22.12+, npm, and Docker Desktop or PostgreSQL 16.

1. Start the local database from the repository root:

   ```powershell
   docker compose up -d postgres
   ```

2. Configure the API:

   ```powershell
   cd Backend
   Copy-Item .env.example .env
   ```

   Set `JWT_SECRET` to at least 32 random characters. The example database URL and Docker password are for local development only.

3. Install and migrate:

   ```powershell
   npm install
   npm run db:migrate
   ```

4. To create the first admin, fill `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`, and `BOOTSTRAP_ADMIN_PASSWORD` in `Backend/.env` with your own values, then run:

   ```powershell
   npm run db:bootstrap-admin
   ```

   The script refuses to overwrite an existing account. Remove the bootstrap password from the environment after the one-time setup.

5. Start the API:

   ```powershell
   npm run dev
   ```

   Health check: `http://localhost:4000/health`. The API endpoints are under `/api`; login is `POST /api/auth/login`, student registration is `POST /api/auth/register`, and profile lookup is `GET /api/auth/me`.

### PostgreSQL API Boundary

The PostgreSQL schema and role-protected API are implemented as a separate service package. The current dashboard still reads/writes its local demo adapter; it does not yet switch its screens to PostgreSQL or use API login. Do not confuse API readiness with an end-to-end cloud-backed frontend. The follow-up integration phase should add an authenticated frontend session, map API DTOs to UI models, and replace local mutations with the API service while keeping local mode selectable.

## Environment Variables

`Frontend/.env.example`:

- `VITE_DATA_MODE=demo`: current local presentation mode.
- `VITE_API_URL=http://localhost:4000/api`: API base URL for the planned frontend integration.

`Backend/.env.example`:

- `PORT`: Express port, defaults to 4000.
- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: at least 32 characters; never expose to the browser.
- `FRONTEND_ORIGIN`: exact browser origin allowed by CORS.
- `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_PASSWORD`: one-time first-admin bootstrap settings.

Never commit `.env` files. `DATABASE_URL` and `JWT_SECRET` are server-only secrets. No Firebase configuration or service-account credential is used.

## GPS Behavior

- The map’s seeded positions and geometry are demonstration data and are labelled **Demo GPS** / **sample route geometry**.
- Demo movement runs only while a demo trip is active and the play control is enabled.
- Browser GPS is requested only after a driver starts a trip and explicitly enables sharing. Location writes are throttled in the browser. Denied/unavailable location is shown as an error; no coordinates are substituted.
- Local demo GPS is stored in this browser. In the PostgreSQL API phase, the API validates driver, assigned bus, and active trip and assigns `recorded_at` on the server.
- A location older than 60 seconds, or no location, displays **GPS Offline**. ETA remains unavailable.

## Tests And Build

```powershell
cd Frontend
npm test
npm run build
```

```powershell
cd Backend
npm test
npm run build
```

Frontend unit tests cover seeded data, location freshness/source, latest GPS readings, schedule overlap, duplicate active trips, trip status transitions, holiday overrides, and CSV escaping. The backend has a database-independent role-claim whitelist test; PostgreSQL API integration tests and automated migrations against a disposable database remain to be added. The current environment used to prepare this project did not have Node/npm installed, so package installation, browser launch, and production builds could not be verified here.

## Deployment

- Frontend: build with `cd Frontend; npm install; npm run build` and deploy `Frontend/dist` to Vercel or another static host. Configure HTTPS and the correct public frontend origin.
- API: deploy `Backend` to a Node 20+ host such as Render or Railway. Set `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN`, run `npm run db:migrate` as a release step, and keep the database private.
- Do not deploy the Docker Compose development password or bootstrap credentials. Configure database backups, TLS, monitoring, rate limiting, and secret rotation.

## Demonstration Guide

1. Start the frontend and review the admin overview.
2. Add a bus and a driver; update assignments and availability.
3. Open Routes & schedules, create a route, and add/reorder stops.
4. Add a non-overlapping schedule and create a holiday or service override.
5. Publish a delay or route notice for a specific audience.
6. Switch to Student and review the assigned bus, route, schedule, and relevant notices.
7. Open Live tracking and inspect sample paths, stops, and the demo GPS labels.
8. Switch to Driver, start the assigned demo trip, then play/pause/reset simulated movement.
9. Enable browser GPS only when testing location permission; decline permission to see the error path.
10. Return to Admin, review reports, and export trip CSV.
11. To demonstrate PostgreSQL separately, start the database/API and use the documented setup. The dashboard itself remains in local demo mode until the frontend integration phase is completed.

## Known Limitations

- Frontend authentication and role switching are demo-only; PostgreSQL login is not yet connected to the dashboard.
- PostgreSQL API does not yet include a production password-reset email flow, full audit log, read receipts endpoint, API rate limiting, or end-to-end integration tests.
- Local demo records are shared within one browser profile and are not secure user accounts.
- GPS history is stored as separate rows, but an automated retention/cleanup job is not included; define and schedule a retention policy before storing production location data.
- Map geometry and coordinates are sample data, not a route-planning service or real operational route feed.
- No ETA is displayed because adequate speed/travel-time data is unavailable.

## Future Enhancements

- Integrate PostgreSQL API auth and typed DTO services into all screens, with an explicit demo/PostgreSQL mode selector.
- Add PostgreSQL integration/security tests, audit history, password reset, admin approval, and API throttling.
- Add schedule editing, role-scoped profile management, notification read receipts, GPS retention cleanup, and validated real route geometry.
- Add production ETA calculations only after obtaining appropriate travel-time/speed inputs.