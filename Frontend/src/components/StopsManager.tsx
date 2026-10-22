import { useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, MapPin, Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import type { DemoState, RouteStop } from '../types';
import { createId } from '../services/demoStore';

const stopSchema = z.object({
  name: z.string().trim().min(2, 'Enter a stop name.'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  plannedArrivalTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter a valid planned time.'),
});

export default function StopsManager({ data, onMutate }: { data: DemoState; onMutate: (change: (current: DemoState) => DemoState) => void }) {
  const [selectedId, setSelectedId] = useState(data.routes[0]?.id ?? '');
  const [error, setError] = useState('');
  const route = data.routes.find((item) => item.id === selectedId) ?? data.routes[0];

  function updateStops(nextStops: RouteStop[]) {
    if (!route) return;
    onMutate((current) => ({ ...current, routes: current.routes.map((item) => item.id === route.id ? { ...item, stops: nextStops.map((stop, index) => ({ ...stop, stopOrder: index })) } : item) }));
  }

  function addStop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = stopSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget).entries()));
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check the stop details.'); return; }
    if (!route) return;
    const stop: RouteStop = { id: createId('stop'), ...parsed.data, stopOrder: route.stops.length };
    updateStops([...route.stops, stop]);
    event.currentTarget.reset(); setError('');
  }

  function moveStop(index: number, offset: -1 | 1) {
    if (!route) return;
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= route.stops.length) return;
    const next = [...route.stops];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    updateStops(next);
  }

  if (!route) return <section className="panel stops-manager"><div className="empty-inline">Create a route before adding stops.</div></section>;

  return <section className="panel stops-manager">
    <div className="panel-heading"><div><p className="eyebrow">ROUTE DEFINITION</p><h2>Ordered stops</h2></div><select className="filter-select" aria-label="Route for stop management" value={route.id} onChange={(event) => { setSelectedId(event.target.value); setError(''); }}>{data.routes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
    <form className="stop-create-form" onSubmit={addStop}><label>Stop name<input name="name" required placeholder="Main Street Station" /></label><label>Latitude<input name="latitude" type="number" min="-90" max="90" step="any" required placeholder="12.9716" /></label><label>Longitude<input name="longitude" type="number" min="-180" max="180" step="any" required placeholder="77.5946" /></label><label>Planned time<input name="plannedArrivalTime" type="time" required /></label><button className="button button-primary"><Plus size={14} />Add stop</button></form>
    {error && <p className="field-error form-error" role="alert">{error}</p>}
    {route.stops.length ? <div className="managed-stop-list">{route.stops.map((stop, index) => <div className="managed-stop-row" key={stop.id}><span className="managed-stop-order">{String(index + 1).padStart(2, '0')}</span><MapPin size={14} className="soft-icon" /><span className="managed-stop-name"><strong>{stop.name}</strong><small>{stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}</small></span><time>{stop.plannedArrivalTime}</time><div className="row-actions"><button aria-label={`Move ${stop.name} up`} title="Move up" disabled={index === 0} onClick={() => moveStop(index, -1)}><ArrowUp size={14} /></button><button aria-label={`Move ${stop.name} down`} title="Move down" disabled={index === route.stops.length - 1} onClick={() => moveStop(index, 1)}><ArrowDown size={14} /></button><button aria-label={`Remove ${stop.name}`} onClick={() => updateStops(route.stops.filter((item) => item.id !== stop.id))}><Trash2 size={14} /></button></div></div>)}</div> : <div className="empty-stops">No stops configured for {route.name}.</div>}
    <p className="privacy-footnote">Coordinates are saved exactly as entered. New stops do not create or modify route geometry.</p>
  </section>;
}