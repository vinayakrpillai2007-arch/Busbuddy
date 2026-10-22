import { useMemo, useState, type FormEvent } from 'react';
import { BusFront, Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { z } from 'zod';
import type { Bus, DemoState } from '../types';
import { createId } from '../services/demoStore';

const busSchema = z.object({
  busNumber: z.string().trim().min(2, 'Enter a bus number.'),
  registrationNumber: z.string().trim().min(3, 'Enter a registration number.'),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1.').max(100),
  routeId: z.string().min(1, 'Choose a route.'),
  assignedDriverId: z.string(),
  status: z.enum(['Active', 'Inactive', 'Maintenance']),
});

interface FleetPageProps { data: DemoState; onMutate: (change: (current: DemoState) => DemoState) => void; }

export default function FleetPage({ data, onMutate }: FleetPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [editing, setEditing] = useState<Bus | null>(null);
  const [adding, setAdding] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const buses = useMemo(() => data.buses.filter((bus) => {
    const routeName = data.routes.find((route) => route.id === bus.routeId)?.name ?? '';
    return `${bus.busNumber} ${bus.registrationNumber} ${routeName}`.toLowerCase().includes(search.toLowerCase()) && (statusFilter === 'All statuses' || bus.status === statusFilter);
  }), [data, search, statusFilter]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = busSchema.safeParse(Object.fromEntries(form.entries()));
    if (!parsed.success) { setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]))); return; }
    const duplicate = data.buses.some((bus) => bus.id !== editing?.id && (bus.busNumber.toLowerCase() === parsed.data.busNumber.toLowerCase() || bus.registrationNumber.toLowerCase() === parsed.data.registrationNumber.toLowerCase()));
    if (duplicate) { setErrors({ busNumber: 'Bus number and registration must be unique.' }); return; }
    const next: Bus = { id: editing?.id ?? createId('bus'), ...parsed.data };
    onMutate((current) => {
      const previous = editing ? current.buses.find((bus) => bus.id === editing.id) : undefined;
      const buses = editing
        ? current.buses.map((bus) => bus.id === editing.id ? next : bus)
        : [...current.buses, next];
      const normalizedBuses = buses.map((bus) => bus.id !== next.id && next.assignedDriverId && bus.assignedDriverId === next.assignedDriverId
        ? { ...bus, assignedDriverId: '' }
        : bus);
      const drivers = current.drivers.map((driver) => {
        if (driver.id === next.assignedDriverId) return { ...driver, assignedBusId: next.id };
        if (previous?.assignedDriverId === driver.id || driver.assignedBusId === next.id) return { ...driver, assignedBusId: '' };
        return driver;
      });
      return { ...current, buses: normalizedBuses, drivers };
    });
    setEditing(null); setAdding(false); setErrors({});
  }

  function remove(bus: Bus) {
    if (!window.confirm(`Deactivate ${bus.busNumber}? This will remove it from the demo fleet.`)) return;
    onMutate((current) => ({
      ...current,
      buses: current.buses.filter((item) => item.id !== bus.id),
      drivers: current.drivers.map((driver) => driver.assignedBusId === bus.id ? { ...driver, assignedBusId: '' } : driver),
    }));
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">ADMINISTRATION · VEHICLES</p><h1>Bus fleet</h1><p className="heading-sub">Manage vehicles, route assignments, and operational status.</p></div><button className="button button-primary" onClick={() => { setAdding(true); setEditing(null); }}><Plus size={16} />Add bus</button></div>
    <section className="panel table-panel"><div className="table-toolbar"><label className="search-field"><Search size={15} /><input aria-label="Search buses" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search bus or route" /></label><select className="filter-select compact" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter bus status"><option>All statuses</option><option>Active</option><option>Inactive</option><option>Maintenance</option></select><span className="table-count">{buses.length} vehicles</span></div>
      <div className="table-scroll"><table><thead><tr><th>VEHICLE</th><th>ROUTE</th><th>DRIVER</th><th>CAPACITY</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{buses.map((bus) => { const route = data.routes.find((item) => item.id === bus.routeId); const driver = data.drivers.find((item) => item.id === bus.assignedDriverId); return <tr key={bus.id}><td><div className="vehicle-cell"><span className="vehicle-icon"><BusFront size={16} /></span><span><strong>{bus.busNumber}</strong><small>{bus.registrationNumber}</small></span></div></td><td>{route?.name ?? 'Unassigned'}</td><td>{driver?.fullName ?? 'Unassigned'}</td><td>{bus.capacity} seats</td><td><span className={`status-chip ${bus.status === 'Active' ? 'status-ok' : bus.status === 'Maintenance' ? 'status-warn' : 'status-offline'}`}>{bus.status}</span></td><td><div className="row-actions"><button aria-label={`Edit ${bus.busNumber}`} title="Edit bus" onClick={() => { setEditing(bus); setAdding(false); }}><Pencil size={15} /></button><button aria-label={`Delete ${bus.busNumber}`} title="Delete bus" onClick={() => remove(bus)}><Trash2 size={15} /></button></div></td></tr>; })}</tbody></table>{buses.length === 0 && <div className="empty-table"><BusFront size={22} /><strong>No vehicles found</strong><span>Try another search, or add a bus to the fleet.</span></div>}</div>
    </section>
    {(adding || editing) && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setAdding(false); setEditing(null); } }}><section className="form-modal" role="dialog" aria-modal="true" aria-labelledby="bus-form-title"><div className="modal-header"><div><p className="eyebrow">FLEET RECORD</p><h2 id="bus-form-title">{editing ? `Edit ${editing.busNumber}` : 'Add a bus'}</h2></div><button className="icon-button" aria-label="Close" onClick={() => { setAdding(false); setEditing(null); }}><X size={19} /></button></div><form onSubmit={submit} noValidate><div className="form-grid"><label>Bus number<input name="busNumber" defaultValue={editing?.busNumber} placeholder="CB-106" />{errors.busNumber && <small className="field-error">{errors.busNumber}</small>}</label><label>Registration number<input name="registrationNumber" defaultValue={editing?.registrationNumber} placeholder="DEMO-106" />{errors.registrationNumber && <small className="field-error">{errors.registrationNumber}</small>}</label><label>Capacity<input name="capacity" type="number" min="1" max="100" defaultValue={editing?.capacity ?? 40} />{errors.capacity && <small className="field-error">{errors.capacity}</small>}</label><label>Route<select name="routeId" defaultValue={editing?.routeId ?? ''}><option value="">Select a route</option>{data.routes.filter((route) => route.active).map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}</select>{errors.routeId && <small className="field-error">{errors.routeId}</small>}</label><label>Assigned driver<select name="assignedDriverId" defaultValue={editing?.assignedDriverId ?? ''}><option value="">Select a driver</option>{data.drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.fullName}</option>)}</select>{errors.assignedDriverId && <small className="field-error">{errors.assignedDriverId}</small>}</label><label>Operational status<select name="status" defaultValue={editing?.status ?? 'Active'}><option>Active</option><option>Inactive</option><option>Maintenance</option></select></label></div><p className="form-disclaimer">Changes are stored in this browser’s local demo data.</p><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => { setAdding(false); setEditing(null); }}>Cancel</button><button type="submit" className="button button-primary"><Check size={15} />{editing ? 'Save changes' : 'Create bus'}</button></div></form></section></div>}
  </>;
}