import { useMemo, useState, type FormEvent } from 'react';
import { Check, Pencil, Plus, Search, Trash2, UserRound, X } from 'lucide-react';
import { z } from 'zod';
import type { DemoState, Driver } from '../types';
import { createId } from '../services/demoStore';

const driverSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the driver name.'),
  phone: z.string().trim().min(7, 'Enter a valid phone number.'),
  email: z.email('Enter a valid email address.'),
  licenseNumber: z.string().trim().min(3, 'Enter the license reference.'),
  assignedBusId: z.string(),
  availability: z.enum(['Available', 'On trip', 'Unavailable']),
});

export default function DriversPage({ data, onMutate }: { data: DemoState; onMutate: (change: (current: DemoState) => DemoState) => void }) {
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<Driver | 'new' | null>(null);
  const [error, setError] = useState('');
  const drivers = useMemo(() => data.drivers.filter((driver) => `${driver.fullName} ${driver.email} ${driver.phone} ${driver.licenseNumber} ${data.buses.find((bus) => bus.id === driver.assignedBusId)?.busNumber ?? ''}`.toLowerCase().includes(query.toLowerCase())), [data, query]);
  const unassignedBuses = data.buses.filter((bus) => !bus.assignedDriverId || editor !== 'new' && bus.assignedDriverId === editor?.id);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = driverSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget).entries()));
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check driver details.'); return; }
    const currentId = typeof editor === 'object' && editor ? editor.id : undefined;
    if (data.drivers.some((driver) => driver.id !== currentId && (driver.email.toLowerCase() === parsed.data.email.toLowerCase() || driver.licenseNumber.toLowerCase() === parsed.data.licenseNumber.toLowerCase()))) { setError('Email and license number must be unique.'); return; }
    const nextDriver: Driver = { id: currentId ?? createId('driver'), ...parsed.data };
    onMutate((current) => ({
      ...current,
      drivers: currentId ? current.drivers.map((driver) => driver.id === currentId ? nextDriver : driver) : [...current.drivers, nextDriver],
      buses: current.buses.map((bus) => {
        if (bus.assignedDriverId === nextDriver.id && bus.id !== nextDriver.assignedBusId) return { ...bus, assignedDriverId: '' };
        if (nextDriver.assignedBusId && bus.id === nextDriver.assignedBusId) return { ...bus, assignedDriverId: nextDriver.id };
        return bus;
      }),
    }));
    setEditor(null); setError('');
  }

  function remove(driver: Driver) {
    if (!window.confirm(`Remove ${driver.fullName} from demo driver records?`)) return;
    onMutate((current) => ({ ...current, drivers: current.drivers.filter((item) => item.id !== driver.id), buses: current.buses.map((bus) => bus.assignedDriverId === driver.id ? { ...bus, assignedDriverId: '' } : bus) }));
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">ADMINISTRATION · PEOPLE</p><h1>Driver management</h1><p className="heading-sub">Manage driver records and vehicle assignments.</p></div><button className="button button-primary" onClick={() => { setEditor('new'); setError(''); }}><Plus size={15} />Add driver</button></div>
    <section className="panel table-panel"><div className="table-toolbar"><label className="search-field"><Search size={15} /><input aria-label="Search drivers" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, bus or license" /></label><span className="table-count">{drivers.length} drivers</span></div><div className="table-scroll"><table><thead><tr><th>DRIVER</th><th>CONTACT</th><th>LICENSE REF.</th><th>ASSIGNED BUS</th><th>AVAILABILITY</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{drivers.map((driver) => <tr key={driver.id}><td><div className="student-cell"><span className="student-avatar"><UserRound size={15} /></span><span><strong>{driver.fullName}</strong><small>Demo profile</small></span></div></td><td>{driver.phone}<small className="table-subline">{driver.email}</small></td><td>{driver.licenseNumber}</td><td>{data.buses.find((bus) => bus.id === driver.assignedBusId)?.busNumber ?? 'Unassigned'}</td><td><select className="availability-select" aria-label={`Availability for ${driver.fullName}`} value={driver.availability} onChange={(event) => onMutate((current) => ({ ...current, drivers: current.drivers.map((item) => item.id === driver.id ? { ...item, availability: event.target.value as Driver['availability'] } : item) }))}><option>Available</option><option>On trip</option><option>Unavailable</option></select></td><td><div className="row-actions"><button aria-label={`Edit ${driver.fullName}`} onClick={() => { setEditor(driver); setError(''); }}><Pencil size={15} /></button><button aria-label={`Remove ${driver.fullName}`} onClick={() => remove(driver)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table>{drivers.length === 0 && <div className="empty-table"><UserRound size={22} /><strong>No drivers found</strong><span>Try another search or add a profile.</span></div>}</div><p className="privacy-footnote">License references are shown to administrators only in this demo view.</p></section>
    {editor && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditor(null); }}><section className="form-modal" role="dialog" aria-modal="true" aria-labelledby="driver-form-title"><div className="modal-header"><div><p className="eyebrow">DRIVER RECORD</p><h2 id="driver-form-title">{editor === 'new' ? 'Add a driver' : `Edit ${editor.fullName}`}</h2></div><button className="icon-button" aria-label="Close" onClick={() => setEditor(null)}><X size={19} /></button></div><form onSubmit={save} noValidate><div className="form-grid"><label>Full name<input name="fullName" defaultValue={editor === 'new' ? '' : editor.fullName} />{error && <small className="field-error">{error}</small>}</label><label>Phone<input name="phone" defaultValue={editor === 'new' ? '' : editor.phone} placeholder="+1 555 010 2000" /></label><label>Email<input name="email" type="email" defaultValue={editor === 'new' ? '' : editor.email} /></label><label>License reference<input name="licenseNumber" defaultValue={editor === 'new' ? '' : editor.licenseNumber} /></label><label>Assigned bus<select name="assignedBusId" defaultValue={editor === 'new' ? '' : editor.assignedBusId}><option value="">No bus assigned</option>{unassignedBuses.map((bus) => <option value={bus.id} key={bus.id}>{bus.busNumber}</option>)}</select></label><label>Availability<select name="availability" defaultValue={editor === 'new' ? 'Available' : editor.availability}><option>Available</option><option>On trip</option><option>Unavailable</option></select></label></div><p className="form-disclaimer">This creates a local demo profile only; no login account is provisioned.</p><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setEditor(null)}>Cancel</button><button className="button button-primary"><Check size={15} />Save driver</button></div></form></section></div>}
  </>;
}