import { useState, type FormEvent } from 'react';
import { CalendarDays, Check, Plus, Route as RouteIcon, Trash2 } from 'lucide-react';
import { z } from 'zod';
import type { DemoState, Holiday, Schedule, TransitRoute } from '../types';
import { createId } from '../services/demoStore';
import StopsManager from '../components/StopsManager';
import { hasScheduleConflict } from '../utils/transit';

type Tab = 'routes' | 'schedules' | 'holidays';
interface OperationsPageProps { data: DemoState; onMutate: (change: (current: DemoState) => DemoState) => void; }
const routeSchema = z.object({ name: z.string().trim().min(3, 'Enter a route name.'), startPoint: z.string().trim().min(2, 'Enter a start point.'), destination: z.string().trim().min(2, 'Enter a destination.'), estimatedDuration: z.coerce.number().int().min(1).max(240) });
const scheduleSchema = z.object({ busId: z.string().min(1, 'Select a bus.'), routeId: z.string().min(1, 'Select a route.'), departureTime: z.string().min(1, 'Set a departure time.'), arrivalTime: z.string().min(1, 'Set an arrival time.') });
const holidaySchema = z.object({ title: z.string().trim().min(2), startDate: z.string().min(1), endDate: z.string().min(1), type: z.enum(['College holiday', 'Special event', 'Bus-off day']), description: z.string().trim().min(2) });

export default function OperationsPage({ data, onMutate }: OperationsPageProps) {
  const [tab, setTab] = useState<Tab>('routes');
  const [routeOpen, setRouteOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [error, setError] = useState('');

  function addRoute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const parsed = routeSchema.safeParse(Object.fromEntries(form.entries()));
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check route fields.'); return; }
    if (data.routes.some((route) => route.name.toLowerCase() === parsed.data.name.toLowerCase())) { setError('A route with this name already exists.'); return; }
    const route: TransitRoute = { id: createId('route'), ...parsed.data, stops: [], coordinates: [], operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], active: true, geometrySource: 'sample' };
    onMutate((current) => ({ ...current, routes: [...current.routes, route] })); setRouteOpen(false); setError('');
  }

  function addSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const parsed = scheduleSchema.safeParse(Object.fromEntries(form.entries()));
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check schedule fields.'); return; }
    if (parsed.data.arrivalTime <= parsed.data.departureTime) { setError('Arrival must be later than departure. Overnight schedules are not supported.'); return; }
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    if (hasScheduleConflict(data.schedules, { ...parsed.data, operatingDays: dayNames })) { setError('This bus already has a schedule overlapping that time on an operating day.'); return; }
    const schedule: Schedule = { id: createId('schedule'), ...parsed.data, operatingDays: dayNames, status: 'On Time' };
    onMutate((current) => ({ ...current, schedules: [...current.schedules, schedule] })); setScheduleOpen(false); setError('');
  }

  function addHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const parsed = holidaySchema.safeParse(Object.fromEntries(form.entries()));
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check holiday fields.'); return; }
    if (parsed.data.endDate < parsed.data.startDate) { setError('End date must be on or after start date.'); return; }
    const holiday: Holiday = { id: createId('holiday'), ...parsed.data, busOperationOverride: form.get('busOperationOverride') === 'on' };
    onMutate((current) => ({ ...current, holidays: [...current.holidays, holiday] })); setHolidayOpen(false); setError('');
  }

  function remove(kind: Tab, id: string, label: string) {
    if (!window.confirm(`Remove ${label} from local demo data?`)) return;
    onMutate((current) => kind === 'routes' ? ({ ...current, routes: current.routes.filter((item) => item.id !== id) }) : kind === 'schedules' ? ({ ...current, schedules: current.schedules.filter((item) => item.id !== id) }) : ({ ...current, holidays: current.holidays.filter((item) => item.id !== id) }));
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">ADMINISTRATION · SERVICE PLANNING</p><h1>Routes & schedules</h1><p className="heading-sub">Manage route definitions, weekday timetables, and service exceptions.</p></div></div>
    <section className="panel operations-panel"><div className="management-tabs" role="tablist" aria-label="Service management"><button role="tab" aria-selected={tab === 'routes'} className={tab === 'routes' ? 'selected' : ''} onClick={() => setTab('routes')}><RouteIcon size={15} />Routes <span>{data.routes.length}</span></button><button role="tab" aria-selected={tab === 'schedules'} className={tab === 'schedules' ? 'selected' : ''} onClick={() => setTab('schedules')}><CalendarDays size={15} />Schedules <span>{data.schedules.length}</span></button><button role="tab" aria-selected={tab === 'holidays'} className={tab === 'holidays' ? 'selected' : ''} onClick={() => setTab('holidays')}><CalendarDays size={15} />Holidays <span>{data.holidays.length}</span></button></div>
      {tab === 'routes' && <div className="operations-content"><div className="operations-subhead"><div><h2>Route directory</h2><p>New routes start without stops or drawn map geometry.</p></div><button className="button button-primary" onClick={() => { setRouteOpen(!routeOpen); setError(''); }}><Plus size={15} />Add route</button></div>{routeOpen && <form className="inline-form" onSubmit={addRoute}><label>Route name<input name="name" placeholder="West Campus" required /></label><label>Start point<input name="startPoint" placeholder="West Station" required /></label><label>Destination<input name="destination" placeholder="Northfield College" required /></label><label>Duration (min)<input name="estimatedDuration" type="number" min="1" max="240" defaultValue="35" required /></label><button className="button button-primary"><Check size={15} />Save route</button></form>}{error && <div className="field-error form-error">{error}</div>}{data.routes.map((route) => <article className="route-admin-row" key={route.id}><span className="route-admin-icon"><RouteIcon size={17} /></span><div className="route-admin-copy"><strong>{route.name}</strong><span>{route.startPoint} <b>→</b> {route.destination}</span><small>{route.stops.length} stops · {route.estimatedDuration} min · {route.geometrySource === 'sample' && route.coordinates.length ? 'Sample map geometry' : 'No map geometry configured'}</small>{route.stops.map((stop) => <span className="stop-inline" key={stop.id}>{stop.plannedArrivalTime} · {stop.name}</span>)}</div><span className={`status-chip ${route.active ? 'status-ok' : 'status-offline'}`}>{route.active ? 'Active' : 'Inactive'}</span><button className="icon-action" title={route.active ? 'Deactivate route' : 'Activate route'} onClick={() => onMutate((current) => ({ ...current, routes: current.routes.map((item) => item.id === route.id ? { ...item, active: !item.active } : item) }))}>{route.active ? 'Deactivate' : 'Activate'}</button><button className="icon-action danger" aria-label={`Remove ${route.name}`} onClick={() => remove('routes', route.id, route.name)}><Trash2 size={15} /></button></article>)}</div>}
      {tab === 'routes' && <StopsManager data={data} onMutate={onMutate} />}
      {tab === 'schedules' && <div className="operations-content"><div className="operations-subhead"><div><h2>Scheduled departures</h2><p>Weekday service · overlapping bus schedules are rejected.</p></div><button className="button button-primary" onClick={() => { setScheduleOpen(!scheduleOpen); setError(''); }}><Plus size={15} />Add schedule</button></div>{scheduleOpen && <form className="inline-form" onSubmit={addSchedule}><label>Bus<select name="busId" required defaultValue=""><option value="">Select bus</option>{data.buses.filter((bus) => bus.status === 'Active').map((bus) => <option value={bus.id} key={bus.id}>{bus.busNumber}</option>)}</select></label><label>Route<select name="routeId" required defaultValue=""><option value="">Select route</option>{data.routes.filter((route) => route.active).map((route) => <option value={route.id} key={route.id}>{route.name}</option>)}</select></label><label>Departure<input type="time" name="departureTime" required /></label><label>Arrival<input type="time" name="arrivalTime" required /></label><button className="button button-primary"><Check size={15} />Save schedule</button></form>}{error && <div className="field-error form-error">{error}</div>}{data.schedules.map((schedule) => <article className="schedule-admin-row" key={schedule.id}><strong>{schedule.departureTime}<small>to {schedule.arrivalTime}</small></strong><span><b>{data.routes.find((route) => route.id === schedule.routeId)?.name ?? 'Route removed'}</b><small>{data.buses.find((bus) => bus.id === schedule.busId)?.busNumber ?? 'Bus removed'} · {schedule.operatingDays.join(', ')}</small></span><span className={`status-chip ${schedule.status === 'Delayed' ? 'status-warn' : 'status-ok'}`}>{schedule.status}</span><button className="icon-action danger" aria-label="Delete schedule" onClick={() => remove('schedules', schedule.id, 'schedule')}><Trash2 size={15} /></button></article>)}</div>}
      {tab === 'holidays' && <div className="operations-content"><div className="operations-subhead"><div><h2>Calendar & exceptions</h2><p>Bus operation is disabled on holidays unless an explicit override is set.</p></div><button className="button button-primary" onClick={() => { setHolidayOpen(!holidayOpen); setError(''); }}><Plus size={15} />Add date</button></div>{holidayOpen && <form className="inline-form holiday-form" onSubmit={addHoliday}><label>Title<input name="title" placeholder="Campus closure" required /></label><label>Type<select name="type"><option>College holiday</option><option>Special event</option><option>Bus-off day</option></select></label><label>Start date<input type="date" name="startDate" required /></label><label>End date<input type="date" name="endDate" required /></label><label className="wide-field">Description<input name="description" required placeholder="Reason for the service change" /></label><label className="checkbox-label"><input type="checkbox" name="busOperationOverride" /> Buses will operate during this holiday</label><button className="button button-primary"><Check size={15} />Save date</button></form>}{error && <div className="field-error form-error">{error}</div>}{data.holidays.map((holiday) => <article className="holiday-row" key={holiday.id}><div className="holiday-date"><strong>{new Date(`${holiday.startDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong><span>{holiday.startDate === holiday.endDate ? 'ONE DAY' : `THROUGH ${holiday.endDate}`}</span></div><div><strong>{holiday.title}</strong><small>{holiday.type} · {holiday.description}</small></div><span className={`status-chip ${holiday.busOperationOverride ? 'status-ok' : 'status-offline'}`}>{holiday.busOperationOverride ? 'Service override' : 'No bus service'}</span><button className="icon-action danger" aria-label={`Delete ${holiday.title}`} onClick={() => remove('holidays', holiday.id, holiday.title)}><Trash2 size={15} /></button></article>)}</div>}
    </section>
  </>;
}