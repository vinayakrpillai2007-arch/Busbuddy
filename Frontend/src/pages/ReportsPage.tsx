import { useMemo, useState } from 'react';
import { Download, FileChartColumn, Route, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DemoState } from '../types';
import { fleetCounts, toCsv } from '../utils/transit';

export default function ReportsPage({ data }: { data: DemoState }) {
  const [range, setRange] = useState('7');
  const fleet = fleetCounts(data.buses);
  const reportTrips = useMemo(() => data.trips.filter((trip) => Date.now() - trip.startTime <= Number(range) * 86_400_000), [data.trips, range]);
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const tripCounts = weekdayNames.map((day, weekday) => ({ day, trips: reportTrips.filter((trip) => new Date(trip.startTime).getDay() === weekday).length }));
  const statusData = [{ name: 'Operational', value: fleet.operational, color: '#4e9a7d' }, { name: 'Maintenance', value: fleet.maintenance, color: '#d18b59' }, { name: 'Inactive', value: fleet.inactive, color: '#aab8c1' }].filter((item) => item.value > 0);
  const utilization = data.buses.map((bus) => ({ name: bus.busNumber, utilization: bus.capacity ? Math.round(data.students.filter((student) => student.assignedBusId === bus.id).length / bus.capacity * 100) : 0 }));
  const activeRoutes = data.routes.filter((route) => route.active).length;

  function downloadCsv() {
    const rows = reportTrips.map((trip) => ({ tripId: trip.id, bus: data.buses.find((bus) => bus.id === trip.busId)?.busNumber ?? 'Unknown', route: data.routes.find((route) => route.id === trip.routeId)?.name ?? 'Unknown', status: trip.status, source: trip.source, startTime: new Date(trip.startTime).toISOString() }));
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = href; link.download = 'northfield-transit-trips.csv'; link.click(); URL.revokeObjectURL(href);
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">DATA & SERVICE REVIEW</p><h1>Reports</h1><p className="heading-sub">Summaries calculated from the current local demo dataset.</p></div><label className="range-selector">Trip range<select value={range} onChange={(event) => setRange(event.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label></div>
    <div className="stats-grid report-stats"><ReportMetric icon={FileChartColumn} title="Trips in range" value={String(reportTrips.length)} detail={`${reportTrips.filter((trip) => trip.status === 'Completed').length} completed`} /><ReportMetric icon={Route} title="Active routes" value={String(activeRoutes)} detail={`${data.schedules.length} schedules`} /><ReportMetric icon={Users} title="Driver availability" value={`${data.drivers.filter((driver) => driver.availability === 'Available').length}/${data.drivers.length}`} detail="Available now" /></div>
    <div className="reports-grid"><section className="panel report-panel"><div className="panel-heading"><div><p className="eyebrow">SERVICE VOLUME</p><h2>Trips by start weekday</h2></div><span className="chart-note">{reportTrips.length} RECORDS</span></div>{reportTrips.length ? <div className="chart-wrap report-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={tripCounts} margin={{ top: 10, right: 6, left: -20, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf1f3" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8797a2', fontSize: 10 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#8797a2', fontSize: 10 }} /><Tooltip /><Bar dataKey="trips" fill="#2a8290" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <ChartEmpty />}</section>
      <section className="panel report-panel"><div className="panel-heading"><div><p className="eyebrow">FLEET STATUS</p><h2>Vehicle distribution</h2></div></div>{fleet.total ? <div className="pie-chart-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={4}>{statusData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="pie-total"><strong>{fleet.total}</strong><span>vehicles</span></div></div> : <ChartEmpty />}<div className="chart-legend">{statusData.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}<b>{item.value}</b></span>)}</div></section>
      <section className="panel report-panel utilization-panel"><div className="panel-heading"><div><p className="eyebrow">ASSIGNMENT RATIO</p><h2>Student assignments by bus</h2></div><span className="chart-note">ASSIGNED / CAPACITY</span></div>{utilization.length ? <div className="utilization-list">{utilization.map((item) => <div className="utilization-row" key={item.name}><span>{item.name}</span><div className="bar-track"><span className="teal" style={{ width: `${Math.min(item.utilization, 100)}%` }} /></div><strong>{item.utilization}%</strong></div>)}</div> : <ChartEmpty />}</section>
      <section className="panel report-panel export-panel"><div className="report-export-icon"><Download size={19} /></div><h2>Export trip data</h2><p>Download trip records from the selected date range as a CSV file.</p><button className="button button-outline" onClick={downloadCsv}><Download size={15} />Download CSV</button></section>
    </div>
  </>;
}

function ReportMetric({ icon: Icon, title, value, detail }: { icon: typeof Route; title: string; value: string; detail: string }) {
  return <section className="metric-card report-metric"><div className="metric-icon teal"><Icon size={18} /></div><div className="metric-label">{title}</div><div className="metric-value">{value}</div><div className="metric-detail">{detail}</div></section>;
}

function ChartEmpty() { return <div className="chart-empty">No records in this selection.</div>; }