CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 120),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'student', 'driver')),
  phone TEXT,
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'pending', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  start_point TEXT NOT NULL,
  destination TEXT NOT NULL,
  estimated_duration_minutes INTEGER NOT NULL CHECK (estimated_duration_minutes BETWEEN 1 AND 1440),
  operating_days TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  sample_geometry BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  stop_order INTEGER NOT NULL CHECK (stop_order >= 0),
  planned_arrival TIME NOT NULL,
  UNIQUE (route_id, stop_order)
);

CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  license_number TEXT NOT NULL UNIQUE,
  availability TEXT NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'on_trip', 'unavailable')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_number TEXT NOT NULL UNIQUE,
  registration_number TEXT NOT NULL UNIQUE,
  capacity INTEGER NOT NULL CHECK (capacity BETWEEN 1 AND 100),
  route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
  assigned_driver_id UUID UNIQUE REFERENCES drivers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  student_number TEXT NOT NULL UNIQUE,
  department TEXT,
  assigned_bus_id UUID REFERENCES buses(id) ON DELETE SET NULL,
  assigned_route_id UUID REFERENCES routes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  departure_time TIME NOT NULL,
  arrival_time TIME NOT NULL,
  operating_days TEXT[] NOT NULL CHECK (cardinality(operating_days) > 0),
  status TEXT NOT NULL DEFAULT 'on_time' CHECK (status IN ('on_time', 'delayed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (arrival_time > departure_time)
);

CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('college_holiday', 'special_event', 'bus_off_day')),
  description TEXT NOT NULL,
  bus_operation_override BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES buses(id),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  route_id UUID NOT NULL REFERENCES routes(id),
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'on_time' CHECK (status IN ('on_time', 'delayed', 'completed', 'cancelled')),
  source TEXT NOT NULL CHECK (source IN ('demo', 'gps')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time IS NULL OR end_time >= start_time)
);
CREATE UNIQUE INDEX IF NOT EXISTS trips_one_open_per_bus ON trips(bus_id) WHERE end_time IS NULL AND status NOT IN ('completed', 'cancelled');
CREATE INDEX IF NOT EXISTS trips_started_at_idx ON trips(start_time DESC);
CREATE INDEX IF NOT EXISTS trips_driver_open_idx ON trips(driver_id) WHERE end_time IS NULL;

CREATE TABLE IF NOT EXISTS gps_locations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy_meters DOUBLE PRECISION NOT NULL CHECK (accuracy_meters >= 0 AND accuracy_meters <= 10000),
  source TEXT NOT NULL CHECK (source IN ('demo', 'gps')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gps_locations_bus_time_idx ON gps_locations(bus_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS gps_locations_trip_time_idx ON gps_locations(trip_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 4 AND 180),
  message TEXT NOT NULL CHECK (length(trim(message)) BETWEEN 8 AND 5000),
  category TEXT NOT NULL CHECK (category IN ('general', 'delay', 'route_change', 'holiday', 'cancellation', 'emergency')),
  audience TEXT NOT NULL CHECK (audience IN ('everyone', 'students', 'drivers')),
  target_bus_id UUID REFERENCES buses(id) ON DELETE SET NULL,
  target_route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_audience_time_idx ON notifications(audience, created_at DESC) WHERE archived = false;

CREATE TABLE IF NOT EXISTS notification_reads (
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);