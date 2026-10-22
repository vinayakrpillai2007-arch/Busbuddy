import { describe, expect, it } from 'vitest';
import type { DemoState, Schedule } from '../types';
import { demoSeed } from '../data/demoData';
import { canStartBusTrip, canTransitionTripStatus, hasScheduleConflict, isHolidayOperating, latestLocation, toCsv, trackingLabel } from './transit';

describe('demonstration seed', () => {
  it('contains linked fleet, drivers, routes, schedules, and explicitly demo GPS', () => {
    expect(demoSeed.buses).toHaveLength(5);
    expect(demoSeed.drivers).toHaveLength(5);
    expect(demoSeed.routes.length).toBeGreaterThanOrEqual(3);
    expect(demoSeed.schedules.length).toBeGreaterThan(0);
    expect(demoSeed.locations.every((location) => location.source === 'demo')).toBe(true);
    expect(demoSeed.routes.every((route) => route.geometrySource === 'sample')).toBe(true);
  });
});

describe('tracking state', () => {
  it('labels demo coordinates explicitly and marks stale positions offline', () => {
    const current = { ...demoSeed.locations[0], timestamp: 10_000 };
    expect(trackingLabel(current, 20_000)).toBe('Demo GPS');
    expect(trackingLabel({ ...current, source: 'gps' }, 20_000)).toBe('GPS Online');
    expect(trackingLabel(current, 70_001)).toBe('GPS Offline');
    expect(trackingLabel(undefined, 20_000)).toBe('GPS Offline');
  });

  it('selects the newest bus location', () => {
    const newest = { ...demoSeed.locations[0], timestamp: 50 };
    const oldest = { ...demoSeed.locations[0], timestamp: 20 };
    expect(latestLocation([oldest, newest], newest.busId)).toEqual(newest);
  });
});

describe('schedule and trip rules', () => {
  const schedule: Schedule = { id: 's1', busId: 'bus-1', routeId: 'route-1', departureTime: '07:00', arrivalTime: '07:45', operatingDays: ['Monday'], status: 'On Time' };

  it('detects overlapping schedules only for same bus and shared days', () => {
    expect(hasScheduleConflict([schedule], { busId: 'bus-1', departureTime: '07:30', arrivalTime: '08:10', operatingDays: ['Monday'] })).toBe(true);
    expect(hasScheduleConflict([schedule], { busId: 'bus-1', departureTime: '07:45', arrivalTime: '08:10', operatingDays: ['Monday'] })).toBe(false);
    expect(hasScheduleConflict([schedule], { busId: 'bus-1', departureTime: '07:30', arrivalTime: '08:10', operatingDays: ['Tuesday'] })).toBe(false);
    expect(hasScheduleConflict([schedule], { busId: 'bus-2', departureTime: '07:30', arrivalTime: '08:10', operatingDays: ['Monday'] })).toBe(false);
  });

  it('prevents an additional open trip for a bus but allows another bus', () => {
    const openTrip = { ...demoSeed.trips[0], endTime: undefined, status: 'On Time' as const };
    expect(canStartBusTrip([openTrip], openTrip.busId)).toBe(false);
    expect(canStartBusTrip([openTrip], 'bus-other')).toBe(true);
    expect(canStartBusTrip([{ ...openTrip, endTime: Date.now() }], openTrip.busId)).toBe(true);
  });

  it('keeps completed and cancelled trips terminal', () => {
    expect(canTransitionTripStatus('On Time', 'Delayed')).toBe(true);
    expect(canTransitionTripStatus('Delayed', 'Completed')).toBe(true);
    expect(canTransitionTripStatus('Completed', 'On Time')).toBe(false);
    expect(canTransitionTripStatus('Cancelled', 'Delayed')).toBe(false);
  });
});

describe('calendar and reports', () => {
  it('applies holiday closure unless an explicit override exists', () => {
    const weekday = new Date('2026-11-03T12:00:00.000Z');
    expect(isHolidayOperating(weekday, demoSeed.holidays)).toEqual({ operating: false, reason: 'Founders Day' });
    const overrideDate = new Date('2026-11-14T12:00:00.000Z');
    expect(isHolidayOperating(overrideDate, demoSeed.holidays)).toEqual({ operating: true, reason: 'Open Campus Saturday override' });
  });

  it('exports escaped CSV and handles empty report data', () => {
    expect(toCsv([])).toBe('');
    expect(toCsv([{ title: 'Delay, morning', message: 'Bus "101"' }])).toBe('"title","message"\r\n"Delay, morning","Bus ""101"""');
    expect(toCsv([{ value: '=HYPERLINK("https://example.invalid")' }])).toBe('"value"\r\n"\'=HYPERLINK(""https://example.invalid"")"');
  });
});