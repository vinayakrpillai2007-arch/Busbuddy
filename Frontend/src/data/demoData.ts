import type { DemoState } from '../types';

const weekday = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const routeOnePath: [number, number][] = [
  [12.9716, 77.5946], [12.9752, 77.6014], [12.9798, 77.6072], [12.9843, 77.6131], [12.9891, 77.6194],
];
const routeTwoPath: [number, number][] = [
  [12.9614, 77.5732], [12.9666, 77.5801], [12.9719, 77.5875], [12.9781, 77.5941], [12.9843, 77.6131],
];
const routeThreePath: [number, number][] = [
  [12.9982, 77.5688], [12.9944, 77.5802], [12.9913, 77.5935], [12.9898, 77.6061], [12.9891, 77.6194],
];

export const demoSeed: DemoState = {
  version: 1,
  routes: [
    { id: 'route-r1', name: 'North Loop', startPoint: 'Cedar Park', destination: 'Northfield College', stops: [
      { id: 'r1-s1', name: 'Cedar Park Gate', latitude: 12.9716, longitude: 77.5946, plannedArrivalTime: '07:10' },
      { id: 'r1-s2', name: 'Market Square', latitude: 12.9798, longitude: 77.6072, plannedArrivalTime: '07:24' },
      { id: 'r1-s3', name: 'Library Junction', latitude: 12.9843, longitude: 77.6131, plannedArrivalTime: '07:36' },
    ], coordinates: routeOnePath, estimatedDuration: 34, operatingDays: weekday, active: true, geometrySource: 'sample' },
    { id: 'route-r2', name: 'Riverside Express', startPoint: 'Riverside Station', destination: 'Northfield College', stops: [
      { id: 'r2-s1', name: 'Riverside Station', latitude: 12.9614, longitude: 77.5732, plannedArrivalTime: '07:05' },
      { id: 'r2-s2', name: 'Museum Road', latitude: 12.9719, longitude: 77.5875, plannedArrivalTime: '07:22' },
      { id: 'r2-s3', name: 'Library Junction', latitude: 12.9843, longitude: 77.6131, plannedArrivalTime: '07:39' },
    ], coordinates: routeTwoPath, estimatedDuration: 38, operatingDays: weekday, active: true, geometrySource: 'sample' },
    { id: 'route-r3', name: 'East Garden', startPoint: 'Garden Estate', destination: 'Northfield College', stops: [
      { id: 'r3-s1', name: 'Garden Estate', latitude: 12.9982, longitude: 77.5688, plannedArrivalTime: '07:00' },
      { id: 'r3-s2', name: 'East Market', latitude: 12.9913, longitude: 77.5935, plannedArrivalTime: '07:19' },
      { id: 'r3-s3', name: 'College East Gate', latitude: 12.9891, longitude: 77.6194, plannedArrivalTime: '07:33' },
    ], coordinates: routeThreePath, estimatedDuration: 36, operatingDays: weekday, active: true, geometrySource: 'sample' },
  ],
  drivers: [
    { id: 'driver-1', fullName: 'Morgan Chen', phone: '+1 555 010 2041', email: 'morgan.chen@example.test', licenseNumber: 'DEMO-LIC-101', assignedBusId: 'bus-101', availability: 'Available' },
    { id: 'driver-2', fullName: 'Samira Patel', phone: '+1 555 010 2042', email: 'samira.patel@example.test', licenseNumber: 'DEMO-LIC-102', assignedBusId: 'bus-102', availability: 'Available' },
    { id: 'driver-3', fullName: 'Jordan Reyes', phone: '+1 555 010 2043', email: 'jordan.reyes@example.test', licenseNumber: 'DEMO-LIC-103', assignedBusId: 'bus-103', availability: 'Available' },
    { id: 'driver-4', fullName: 'Avery Brooks', phone: '+1 555 010 2044', email: 'avery.brooks@example.test', licenseNumber: 'DEMO-LIC-104', assignedBusId: 'bus-104', availability: 'Unavailable' },
    { id: 'driver-5', fullName: 'Taylor Kim', phone: '+1 555 010 2045', email: 'taylor.kim@example.test', licenseNumber: 'DEMO-LIC-105', assignedBusId: 'bus-105', availability: 'Available' },
  ],
  buses: [
    { id: 'bus-101', busNumber: 'CB-101', registrationNumber: 'DEMO-101', capacity: 42, routeId: 'route-r1', assignedDriverId: 'driver-1', status: 'Active' },
    { id: 'bus-102', busNumber: 'CB-102', registrationNumber: 'DEMO-102', capacity: 36, routeId: 'route-r2', assignedDriverId: 'driver-2', status: 'Active' },
    { id: 'bus-103', busNumber: 'CB-103', registrationNumber: 'DEMO-103', capacity: 40, routeId: 'route-r3', assignedDriverId: 'driver-3', status: 'Active' },
    { id: 'bus-104', busNumber: 'CB-104', registrationNumber: 'DEMO-104', capacity: 32, routeId: 'route-r1', assignedDriverId: 'driver-4', status: 'Maintenance' },
    { id: 'bus-105', busNumber: 'CB-105', registrationNumber: 'DEMO-105', capacity: 44, routeId: 'route-r2', assignedDriverId: 'driver-5', status: 'Inactive' },
  ],
  students: [
    { id: 'student-1', fullName: 'Alex Rivera', studentId: 'NF-24018', email: 'alex.rivera@example.test', department: 'Environmental Studies', assignedBusId: 'bus-101', assignedRouteId: 'route-r1' },
    { id: 'student-2', fullName: 'Jamie Park', studentId: 'NF-24031', email: 'jamie.park@example.test', department: 'Computer Science', assignedBusId: 'bus-102', assignedRouteId: 'route-r2' },
    { id: 'student-3', fullName: 'Riley James', studentId: 'NF-24045', email: 'riley.james@example.test', department: 'Design', assignedBusId: 'bus-103', assignedRouteId: 'route-r3' },
  ],
  schedules: [
    { id: 'schedule-1', busId: 'bus-101', routeId: 'route-r1', departureTime: '07:00', arrivalTime: '07:34', operatingDays: weekday, status: 'On Time' },
    { id: 'schedule-2', busId: 'bus-102', routeId: 'route-r2', departureTime: '07:00', arrivalTime: '07:38', operatingDays: weekday, status: 'On Time' },
    { id: 'schedule-3', busId: 'bus-103', routeId: 'route-r3', departureTime: '07:00', arrivalTime: '07:36', operatingDays: weekday, status: 'On Time' },
    { id: 'schedule-4', busId: 'bus-104', routeId: 'route-r1', departureTime: '08:10', arrivalTime: '08:44', operatingDays: ['Monday', 'Wednesday', 'Friday'], status: 'Delayed' },
  ],
  trips: [
    { id: 'trip-1', busId: 'bus-101', driverId: 'driver-1', routeId: 'route-r1', startTime: Date.now() - 2 * 86_400_000, endTime: Date.now() - 2 * 86_400_000 + 39 * 60_000, status: 'Completed', source: 'demo' },
    { id: 'trip-2', busId: 'bus-102', driverId: 'driver-2', routeId: 'route-r2', startTime: Date.now() - 2 * 86_400_000, endTime: Date.now() - 2 * 86_400_000 + 40 * 60_000, status: 'Completed', source: 'demo' },
    { id: 'trip-3', busId: 'bus-103', driverId: 'driver-3', routeId: 'route-r3', startTime: Date.now() - 86_400_000, endTime: Date.now() - 86_400_000 + 42 * 60_000, status: 'Completed', source: 'demo' },
  ],
  locations: [
    { busId: 'bus-101', driverId: 'driver-1', tripId: 'trip-1', latitude: 12.9798, longitude: 77.6072, accuracy: 12, source: 'demo', timestamp: Date.now() },
    { busId: 'bus-102', driverId: 'driver-2', tripId: 'trip-2', latitude: 12.9719, longitude: 77.5875, accuracy: 10, source: 'demo', timestamp: Date.now() - 95_000 },
  ],
  holidays: [
    { id: 'holiday-1', title: 'Founders Day', startDate: '2026-11-03', endDate: '2026-11-03', type: 'College holiday', description: 'Campus closed for the annual college observance.', busOperationOverride: false },
    { id: 'holiday-2', title: 'Open Campus Saturday', startDate: '2026-11-14', endDate: '2026-11-14', type: 'Special event', description: 'Limited shuttle service for the campus open day.', busOperationOverride: true },
  ],
  notifications: [
    { id: 'notice-1', title: 'North Loop running 8 minutes late', message: 'Traffic near Market Square is slowing bus CB-101. The next update will appear here.', category: 'Delay', audience: 'Everyone', targetBusId: 'bus-101', targetRouteId: 'route-r1', createdAt: Date.now() - 18 * 60_000, archived: false },
    { id: 'notice-2', title: 'Founders Day service notice', message: 'Regular campus bus service will not operate on November 3.', category: 'Holiday', audience: 'Students', createdAt: Date.now() - 4 * 60 * 60_000, archived: false },
    { id: 'notice-3', title: 'Riverside stop moved temporarily', message: 'Please use the station north entrance while sidewalk repairs are underway.', category: 'Route Change', audience: 'Everyone', targetRouteId: 'route-r2', createdAt: Date.now() - 7 * 60 * 60_000, archived: false },
  ],
};