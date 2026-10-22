import { useState, type FormEvent } from 'react';
import { Archive, BellRing, Check, Plus, Send } from 'lucide-react';
import { z } from 'zod';
import type { DemoState, TransitNotification, UserRole } from '../types';
import { createId } from '../services/demoStore';

interface NoticesPageProps { data: DemoState; role: UserRole; onMutate: (change: (current: DemoState) => DemoState) => void; }
const noticeSchema = z.object({ title: z.string().trim().min(4, 'Add a clear title.'), message: z.string().trim().min(8, 'Message must have at least 8 characters.'), category: z.enum(['General', 'Delay', 'Route Change', 'Holiday', 'Cancellation', 'Emergency']), audience: z.enum(['Everyone', 'Students', 'Drivers']) });

export default function NoticesPage({ data, role, onMutate }: NoticesPageProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState('Current');
  const [error, setError] = useState('');
  function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const parsed = noticeSchema.safeParse(Object.fromEntries(form.entries()));
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check notice fields.'); return; }
    const notice: TransitNotification = { id: createId('notice'), ...parsed.data, targetBusId: String(form.get('targetBusId') || '') || undefined, targetRouteId: String(form.get('targetRouteId') || '') || undefined, createdAt: Date.now(), archived: false };
    onMutate((current) => ({ ...current, notifications: [notice, ...current.notifications] })); setFormOpen(false); setError('');
  }
  const forRole = (item: TransitNotification) => {
    if (role === 'Admin') return true;
    if (item.audience !== 'Everyone' && item.audience !== `${role}s`) return false;
    const viewerBusId = role === 'Student'
      ? data.students[0]?.assignedBusId
      : data.buses.find((bus) => bus.assignedDriverId === data.drivers[0]?.id)?.id;
    const viewerRouteId = role === 'Student'
      ? data.students[0]?.assignedRouteId
      : data.routes.find((route) => route.id === data.buses.find((bus) => bus.id === viewerBusId)?.routeId)?.id;
    return (!item.targetBusId || item.targetBusId === viewerBusId) && (!item.targetRouteId || item.targetRouteId === viewerRouteId);
  };
  const notices = data.notifications.filter((item) => (filter === 'Current' ? !item.archived : item.archived) && forRole(item));

  return <>
    <div className="page-heading"><div><p className="eyebrow">COMMUNICATIONS · SERVICE UPDATES</p><h1>Notices</h1><p className="heading-sub">{role === 'Admin' ? 'Publish transport announcements for students and drivers.' : 'Notices relevant to your demo role.'}</p></div>{role === 'Admin' && <button className="button button-primary" onClick={() => { setFormOpen(!formOpen); setError(''); }}><Plus size={15} />Create notice</button>}</div>
    {role === 'Admin' && formOpen && <section className="panel notice-compose"><div className="panel-heading"><div><p className="eyebrow">NEW ANNOUNCEMENT</p><h2>Compose a service notice</h2></div><Send size={18} className="soft-icon" /></div><form onSubmit={publish} className="notice-form"><label>Title<input name="title" placeholder="Short, specific headline" required /></label><label>Category<select name="category"><option>General</option><option>Delay</option><option>Route Change</option><option>Holiday</option><option>Cancellation</option><option>Emergency</option></select></label><label>Audience<select name="audience"><option>Everyone</option><option>Students</option><option>Drivers</option></select></label><label>Related bus <span className="optional-label">optional</span><select name="targetBusId"><option value="">All buses</option>{data.buses.map((bus) => <option key={bus.id} value={bus.id}>{bus.busNumber}</option>)}</select></label><label>Related route <span className="optional-label">optional</span><select name="targetRouteId"><option value="">All routes</option>{data.routes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}</select></label><label className="notice-message-field">Message<textarea name="message" rows={3} placeholder="Share verified service information..." required /></label>{error && <span className="field-error">{error}</span>}<div className="notice-form-actions"><span>Publishing updates local demo storage.</span><button className="button button-primary"><Check size={15} />Publish notice</button></div></form></section>}
    <section className="panel notices-list-panel"><div className="list-toolbar"><div className="management-tabs compact-tabs"><button className={filter === 'Current' ? 'selected' : ''} onClick={() => setFilter('Current')}>Current <span>{data.notifications.filter((item) => !item.archived && forRole(item)).length}</span></button><button className={filter === 'Archived' ? 'selected' : ''} onClick={() => setFilter('Archived')}>Archived <span>{data.notifications.filter((item) => item.archived && forRole(item)).length}</span></button></div></div>{notices.map((notice) => <article className="notice-admin-row" key={notice.id}><span className={`notice-mark ${notice.category.toLowerCase().replaceAll(' ', '-')}`}><BellRing size={14} /></span><div className="notice-admin-main"><div className="notice-title-line"><strong>{notice.title}</strong><time>{new Date(notice.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time></div><p>{notice.message}</p><div className="notice-meta"><span className={`status-chip ${notice.category === 'Emergency' || notice.category === 'Cancellation' ? 'status-warn' : 'status-demo'}`}>{notice.category}</span><span>{notice.audience}</span>{notice.targetBusId && <span>{data.buses.find((bus) => bus.id === notice.targetBusId)?.busNumber}</span>}{notice.targetRouteId && <span>{data.routes.find((route) => route.id === notice.targetRouteId)?.name}</span>}</div></div>{role === 'Admin' && !notice.archived && <button className="icon-action" title="Archive notice" onClick={() => onMutate((current) => ({ ...current, notifications: current.notifications.map((item) => item.id === notice.id ? { ...item, archived: true } : item) }))}><Archive size={15} />Archive</button>}</article>)}{notices.length === 0 && <div className="empty-table"><BellRing size={22} /><strong>No {filter.toLowerCase()} notices</strong><span>Published notices will appear here.</span></div>}</section>
  </>;
}