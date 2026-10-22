import { Activity, ArrowUpRight, BusFront, CalendarDays, Route, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DemoState, UserRole } from '../types';
import { fleetCounts, isHolidayOperating } from '../utils/transit';

interface DashboardPageProps { data: DemoState; role: UserRole; onNavigate: (view: string) => void; }

export default function DashboardPage({ data, role, onNavigate }: DashboardPageProps) {
  const fleet = fleetCounts(data.buses);
  const student = data.students[0];
  const assignedBus = data.buses.find((bus) => bus.id === student?.assignedBusId);
  const assignedRoute = data.routes.find((route) => route.id === student?.assignedRouteId);
  const assignedDriver = data.drivers.find((driver) => driver.id === assignedBus?.assignedDriverId);
  const today = new Date();
  const service = isHolidayOperating(today, data.holidays);
  const todayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const schedulesToday = service.operating ? data.schedules.filter((schedule) => schedule.operatingDays.includes(todayName) && schedule.status !== 'Cancelled') : [];
  const tripChartData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => ({ day, trips: data.trips.filter((trip) => trip.status === 'Completed' && new Date(trip.startTime).getDay() === (index + 1) % 7).length }));
  const roleTitle = role === 'Admin' ? 'Good morning, Alex' : role === 'Student' ? 'Your campus commute' : 'Your route, at a glance';

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">NORTHFIELD COLLEGE · TRANSPORTATION</p><h1>{roleTitle}</h1><p className="heading-sub">{service.operating ? 'Here is the transport picture for today.' : `No scheduled bus service today · ${service.reason}.`}</p></div>
        <div className="date-stamp"><CalendarDays size={14} /> {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</div>
      </div>

      {role === 'Student' ? (
        <>
          <div className="stats-grid student-stats">
            <Metric icon={BusFront} label="YOUR BUS" value={assignedBus?.busNumber ?? 'Not assigned'} detail={assignedBus?.status ?? 'Ask transport admin'} tone="lime" />
            <Metric icon={Route} label="YOUR ROUTE" value={assignedRoute?.name ?? 'Not assigned'} detail={assignedRoute?.destination ?? 'Assignment pending'} tone="teal" />
            <Metric icon={Activity} label="NEXT DEPARTURE" value={schedulesToday.find((schedule) => schedule.busId === assignedBus?.id)?.departureTime ?? (service.operating ? 'No schedule' : 'No service')} detail={service.operating ? 'Weekday service' : service.reason ?? 'No service'} tone="coral" />
          </div>
          <div className="dashboard-columns">
            <section className="panel student-route-card">
              <div className="panel-heading"><div><p className="eyebrow">ASSIGNED TRANSPORT</p><h2>{assignedRoute?.name ?? 'No route assigned'}</h2></div><button className="text-action" onClick={() => onNavigate('tracking')}>Open live map <ArrowUpRight size={15} /></button></div>
              {assignedRoute ? <div className="student-assignment"><div className="assignment-bus"><BusFront size={25} /><strong>{assignedBus?.busNumber}</strong><span>{assignedBus?.capacity} seats</span></div><div className="assignment-details"><p><span>Driver</span><strong>{assignedDriver?.fullName ?? 'Not assigned'}</strong></p><p><span>Contact</span><strong>{assignedDriver?.phone ?? 'Unavailable'}</strong></p><p><span>Stops</span><strong>{assignedRoute.stops.length} on your route</strong></p><p><span>ETA</span><strong className="muted-value">ETA unavailable</strong></p></div></div> : <p className="empty-inline">Your transportation assignment is not available yet.</p>}
            </section>
            <NotificationPanel data={data} role={role} busId={assignedBus?.id} routeId={assignedRoute?.id} />
          </div>
        </>
      ) : role === 'Driver' ? (
        <div className="stats-grid">
          <Metric icon={BusFront} label="ASSIGNED BUS" value={data.buses.find((bus) => bus.id === data.drivers[0]?.assignedBusId)?.busNumber ?? 'Unassigned'} detail="Vehicle assignment" tone="lime" />
          <Metric icon={Route} label="ASSIGNED ROUTE" value={data.routes.find((route) => route.id === data.buses.find((bus) => bus.id === data.drivers[0]?.assignedBusId)?.routeId)?.name ?? 'Unassigned'} detail="Today’s service" tone="teal" />
          <Metric icon={Activity} label="TRIPS IN DATA" value={String(data.trips.length)} detail="Demo records" tone="coral" />
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <Metric icon={BusFront} label="TOTAL FLEET" value={String(fleet.total).padStart(2, '0')} detail={`${fleet.operational} operational`} tone="lime" delta="+1 this month" />
            <Metric icon={Activity} label="ACTIVE TRIPS" value={String(data.trips.filter((trip) => !trip.endTime && trip.status !== 'Cancelled').length).padStart(2, '0')} detail="Currently in progress" tone="teal" delta="Live demo records" />
            <Metric icon={Route} label="ACTIVE ROUTES" value={String(data.routes.filter((route) => route.active).length).padStart(2, '0')} detail={`${data.schedules.length} schedules`} tone="coral" />
            <Metric icon={Users} label="STUDENTS" value={String(data.students.length).padStart(2, '0')} detail={`${data.drivers.length} demo drivers`} tone="blue" />
          </div>
          <div className="dashboard-columns overview-columns">
            <section className="panel chart-panel">
              <div className="panel-heading"><div><p className="eyebrow">SERVICE ACTIVITY</p><h2>Completed trips</h2></div><span className="chart-note">DEMO DATA · BY WEEKDAY</span></div>
              <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={tripChartData} margin={{ top: 10, right: 4, left: -22, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf1f3" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8797a2', fontSize: 10 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#8797a2', fontSize: 10 }} /><Tooltip cursor={{ fill: '#f2f6f6' }} /><Bar dataKey="trips" fill="#2a8290" radius={[4, 4, 0, 0]} maxBarSize={36} /></BarChart></ResponsiveContainer></div>
            </section>
            <section className="panel fleet-panel">
              <div className="panel-heading"><div><p className="eyebrow">VEHICLE STATUS</p><h2>Fleet at a glance</h2></div><button className="text-action" onClick={() => onNavigate('fleet')}>Manage <ArrowUpRight size={15} /></button></div>
              <div className="fleet-breakdown"><div className="fleet-number"><strong>{fleet.total}</strong><span>Total vehicles</span></div><div className="fleet-bars"><StatusBar label="Operational" amount={fleet.operational} total={fleet.total} color="green" /><StatusBar label="Maintenance" amount={fleet.maintenance} total={fleet.total} color="orange" /><StatusBar label="Inactive" amount={fleet.inactive} total={fleet.total} color="gray" /></div></div>
              <button type="button" className="quick-link-row" onClick={() => onNavigate('tracking')}><span className="mini-icon"><MapPinIcon /></span><span><strong>Open live tracking</strong><small>View demo bus positions</small></span><ArrowUpRight size={16} /></button>
            </section>
          </div>
          <div className="dashboard-columns lower-columns"><NotificationPanel data={data} role={role} /><section className="panel schedule-panel"><div className="panel-heading"><div><p className="eyebrow">TODAY · {todayName.toUpperCase()}</p><h2>Upcoming departures</h2></div><CalendarDays size={17} className="soft-icon" /></div>{schedulesToday.slice(0, 3).map((schedule) => { const bus = data.buses.find((item) => item.id === schedule.busId); const route = data.routes.find((item) => item.id === schedule.routeId); return <div className="schedule-row" key={schedule.id}><strong>{schedule.departureTime}</strong><span><b>{route?.name ?? 'Route'}</b><small>{bus?.busNumber} · {route?.destination}</small></span><span className={`status-chip ${schedule.status === 'Delayed' ? 'status-warn' : 'status-ok'}`}>{schedule.status}</span></div>; })}{schedulesToday.length === 0 && <p className="empty-inline">{service.operating ? 'No departures are scheduled for today.' : `No bus service · ${service.reason}.`}</p>}</section></div>
        </>
      )}
    </>
  );
}

function Metric({ icon: Icon, label, value, detail, tone, delta }: { icon: typeof BusFront; label: string; value: string; detail: string; tone: string; delta?: string }) {
  return <section className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={18} /></div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-detail">{delta ? <><ArrowUpRight size={13} /> {delta}</> : detail}</div></section>;
}

function StatusBar({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  return <div className="status-bar-row"><div><span><i className={`legend-dot ${color}`} />{label}</span><strong>{amount}</strong></div><div className="bar-track"><span className={color} style={{ width: `${total ? amount / total * 100 : 0}%` }} /></div></div>;
}

function NotificationPanel({ data, role, busId, routeId }: { data: DemoState; role: UserRole; busId?: string; routeId?: string }) {
  const notices = data.notifications.filter((item) => !item.archived
    && (role === 'Admin' || item.audience === 'Everyone' || item.audience === `${role}s`)
    && (role !== 'Student' || (!item.targetBusId || item.targetBusId === busId) && (!item.targetRouteId || item.targetRouteId === routeId)));
  return <section className="panel notification-panel"><div className="panel-heading"><div><p className="eyebrow">SERVICE UPDATES</p><h2>Recent notices</h2></div><span className="count-badge">{notices.length}</span></div>{notices.slice(0, 3).map((notice) => <article className="notice-row" key={notice.id}><span className={`notice-mark ${notice.category.toLowerCase().replaceAll(' ', '-')}`} /><div><div className="notice-title-line"><strong>{notice.title}</strong><time>{new Date(notice.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div><p>{notice.message}</p><span className="notice-category">{notice.category}</span></div></article>)}</section>;
}

function MapPinIcon() { return <Route size={16} />; }