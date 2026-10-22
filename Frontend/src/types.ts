export type UserRole = 'Admin' | 'Student' | 'Driver';
export type BusStatus = 'Active' | 'Inactive' | 'Maintenance';
export type TripStatus = 'On Time' | 'Delayed' | 'Completed' | 'Cancelled';
export type NotificationCategory = 'General' | 'Delay' | 'Route Change' | 'Holiday' | 'Cancellation' | 'Emergency';

export interface RouteStop {
  id: string;
  stopOrder?: number;
  name: string;
  latitude: number;
  longitude: number;
  plannedArrivalTime: string;
}

export interface TransitRoute {
  id: string;
  name: string;
  startPoint: string;
  destination: string;
  stops: RouteStop[];
  coordinates: [number, number][];
  estimatedDuration: number;
  operatingDays: string[];
  active: boolean;
  geometrySource: 'sample';
}

export interface Bus {
  id: string;
  busNumber: string;
  registrationNumber: string;
  capacity: number;
  routeId: string;
  assignedDriverId: string;
  status: BusStatus;
}

export interface Driver {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  assignedBusId: string;
  availability: 'Available' | 'On trip' | 'Unavailable';
}

export interface Student {
  id: string;
  fullName: string;
  studentId: string;
  email: string;
  department: string;
  assignedBusId: string;
  assignedRouteId: string;
}

export interface Schedule {
  id: string;
  busId: string;
  routeId: string;
  departureTime: string;
  arrivalTime: string;
  operatingDays: string[];
  status: TripStatus;
}

export interface Trip {
  id: string;
  busId: string;
  driverId: string;
  routeId: string;
  startTime: number;
  endTime?: number;
  status: TripStatus;
  source: 'demo' | 'gps';
}

export interface GpsLocation {
  busId: string;
  driverId: string;
  tripId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  source: 'demo' | 'gps';
  timestamp: number;
}

export interface Holiday {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  type: 'College holiday' | 'Special event' | 'Bus-off day';
  description: string;
  busOperationOverride: boolean;
}

export interface TransitNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  audience: 'Everyone' | 'Students' | 'Drivers';
  targetBusId?: string;
  targetRouteId?: string;
  createdAt: number;
  archived: boolean;
}

export interface DemoState {
  version: 1;
  buses: Bus[];
  drivers: Driver[];
  routes: TransitRoute[];
  students: Student[];
  schedules: Schedule[];
  trips: Trip[];
  locations: GpsLocation[];
  holidays: Holiday[];
  notifications: TransitNotification[];
}