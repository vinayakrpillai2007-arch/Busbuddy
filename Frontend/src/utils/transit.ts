import type { Bus, DemoState, GpsLocation, Schedule, TransitRoute } from '../types';

export const LOCATION_FRESHNESS_MS = 60_000;

export function latestLocation(locations: GpsLocation[], busId: string): GpsLocation | undefined {
  return locations.filter((location) => location.busId === busId).sort((a, b) => b.timestamp - a.timestamp)[0];
}

export function trackingLabel(location: GpsLocation | undefined, now = Date.now()): string {
  if (!location || now - location.timestamp > LOCATION_FRESHNESS_MS) return 'GPS Offline';
  return location.source === 'demo' ? 'Demo GPS' : 'GPS Online';
}

export function isHolidayOperating(date: Date, holidays: DemoState['holidays']): { operating: boolean; reason?: string } {
  const isoDate = date.toISOString().slice(0, 10);
  const holiday = holidays.find((item) => item.startDate <= isoDate && item.endDate >= isoDate);
  if (holiday && !holiday.busOperationOverride) return { operating: false, reason: holiday.title };
  if (date.getDay() === 0 || date.getDay() === 6) return { operating: false, reason: 'Weekend schedule' };
  if (holiday?.busOperationOverride) return { operating: true, reason: `${holiday.title} override` };
  return { operating: true };
}

export function fleetCounts(buses: Bus[]): { total: number; operational: number; maintenance: number; inactive: number } {
  return {
    total: buses.length,
    operational: buses.filter((bus) => bus.status === 'Active').length,
    maintenance: buses.filter((bus) => bus.status === 'Maintenance').length,
    inactive: buses.filter((bus) => bus.status === 'Inactive').length,
  };
}

export function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return '';
  const columns = Object.keys(rows[0]);
  const quote = (value: string | number): string => {
    const text = String(value);
    const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replaceAll('"', '""')}"`;
  };
  return [columns.map(quote).join(','), ...rows.map((row) => columns.map((column) => quote(row[column] ?? '')).join(','))].join('\r\n');
}

export function routeForBus(routes: TransitRoute[], bus: Bus): TransitRoute | undefined {
  return routes.find((route) => route.id === bus.routeId);
}

export function hasScheduleConflict(schedules: Schedule[], candidate: Pick<Schedule, 'busId' | 'departureTime' | 'arrivalTime' | 'operatingDays'>): boolean {
  return schedules.some((schedule) => schedule.busId === candidate.busId
    && schedule.operatingDays.some((day) => candidate.operatingDays.includes(day))
    && candidate.departureTime < schedule.arrivalTime
    && schedule.departureTime < candidate.arrivalTime);
}

export function canStartBusTrip(trips: DemoState['trips'], busId: string): boolean {
  return !trips.some((trip) => trip.busId === busId && !trip.endTime && trip.status !== 'Completed' && trip.status !== 'Cancelled');
}

export function canTransitionTripStatus(current: string, next: string): boolean {
  if (current === 'Completed' || current === 'Cancelled') return false;
  return ['On Time', 'Delayed'].includes(current) && ['On Time', 'Delayed', 'Completed', 'Cancelled'].includes(next);
}