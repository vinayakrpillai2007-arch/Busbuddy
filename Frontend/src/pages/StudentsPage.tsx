import { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import type { DemoState } from '../types';

export default function StudentsPage({ data }: { data: DemoState }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => data.students.filter((student) => {
    const bus = data.buses.find((item) => item.id === student.assignedBusId);
    const route = data.routes.find((item) => item.id === student.assignedRouteId);
    return `${student.fullName} ${student.studentId} ${student.department} ${bus?.busNumber ?? ''} ${route?.name ?? ''} ${route?.stops.map((stop) => stop.name).join(' ') ?? ''}`.toLowerCase().includes(query.toLowerCase());
  }), [data, query]);
  return <>
    <div className="page-heading"><div><p className="eyebrow">STUDENT ASSIGNMENTS</p><h1>Student directory</h1><p className="heading-sub">Search demonstration profiles and their transportation assignments.</p></div><span className="status-chip status-demo">DEMO PROFILES</span></div>
    <section className="panel table-panel"><div className="table-toolbar"><label className="search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, student ID, bus, route or stop" aria-label="Search student directory" /></label><span className="table-count">{results.length} students</span></div><div className="table-scroll"><table><thead><tr><th>STUDENT</th><th>DEPARTMENT</th><th>ASSIGNED BUS</th><th>ROUTE</th><th>FIRST STOP</th></tr></thead><tbody>{results.map((student) => { const bus = data.buses.find((item) => item.id === student.assignedBusId); const route = data.routes.find((item) => item.id === student.assignedRouteId); return <tr key={student.id}><td><div className="student-cell"><span className="student-avatar">{student.fullName.split(' ').map((part) => part[0]).join('')}</span><span><strong>{student.fullName}</strong><small>{student.studentId} · {student.email}</small></span></div></td><td>{student.department}</td><td><span className="bus-number-text">{bus?.busNumber ?? 'Unassigned'}</span></td><td>{route?.name ?? 'Unassigned'}</td><td>{route?.stops[0]?.name ?? 'No stop assigned'}</td></tr>; })}</tbody></table>{results.length === 0 && <div className="empty-table"><Users size={22} /><strong>No students found</strong><span>Try a different search term.</span></div>}</div><p className="privacy-footnote">Demo directory only. In production, student assignment and contact information must be restricted to authorized users.</p></section>
  </>;
}