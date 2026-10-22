import { useMemo, useState } from 'react';
import { LocateFixed, Pause, Play, RotateCcw, Search, Signal, SignalZero } from 'lucide-react';
import TransitMap from '../components/TransitMap';
import type { DemoState } from '../types';
import { latestLocation, trackingLabel } from '../utils/transit';

interface TrackingPageProps {
  data: DemoState;
  simulating: boolean;
  onToggleSimulation: () => void;
  onResetSimulation: () => void;
}

export default function TrackingPage({ data, simulating, onToggleSimulation, onResetSimulation }: TrackingPageProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [selectedBusId, setSelectedBusId] = useState(data.buses[0]?.id ?? '');
  const filtered = useMemo(() => data.buses.filter((bus) => {
    const route = data.routes.find((item) => item.id === bus.routeId);
    const text = `${bus.busNumber} ${route?.name ?? ''} ${route?.stops.map((stop) => stop.name).join(' ') ?? ''}`.toLowerCase();
    const state = trackingLabel(latestLocation(data.locations, bus.id));
    return text.includes(query.toLowerCase()) && (status === 'All statuses' || state === status);
  }), [data, query, status]);
  const selected = data.buses.find((bus) => bus.id === selectedBusId) ?? filtered[0];
  const selectedLocation = selected ? latestLocation(data.locations, selected.id) : undefined;
  const selectedDriver = data.drivers.find((driver) => driver.id === selected?.assignedDriverId);
  const selectedRoute = data.routes.find((route) => route.id === selected?.routeId);

  return <>
    <div className="page-heading tracking-heading"><div><p className="eyebrow">FLEET VISIBILITY</p><h1>Live bus tracking</h1><p className="heading-sub">Map positions are simulated demo data, not live vehicle GPS.</p></div><div className="tracking-controls"><button className={`button ${simulating ? 'button-quiet' : 'button-primary'}`} onClick={onToggleSimulation}>{simulating ? <Pause size={15} /> : <Play size={15} />}{simulating ? 'Pause demo' : 'Play demo'}</button><button className="button button-outline" onClick={onResetSimulation}><RotateCcw size={15} />Reset positions</button></div></div>
    <div className="tracking-banner"><span className="demo-pulse" /><div><strong>DEMO MODE · SAMPLE ROUTE GEOMETRY</strong><span>Simulated locations advance only while the demo is playing. Stale readings show GPS Offline.</span></div><span className="demo-counter">{data.buses.filter((bus) => latestLocation(data.locations, bus.id)).length} tracked</span></div>
    <div className="tracking-layout">
      <section className="map-panel"><TransitMap buses={filtered} drivers={data.drivers} routes={data.routes} locations={data.locations} selectedBusId={selected?.id} onSelectBus={setSelectedBusId} /><div className="map-legend"><span><i className="legend-line" /> Sample route</span><span><i className="legend-stop" /> Stop</span><span><i className="legend-bus" /> Demo bus</span></div><div className="map-attribution-note">Map tiles © OpenStreetMap contributors · coordinates are sample demonstration data</div></section>
      <aside className="tracking-side panel"><div className="tracking-side-title"><div><p className="eyebrow">FLEET MAP</p><h2>Bus locations</h2></div><span className="count-badge">{filtered.length}</span></div><label className="search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bus, route or stop" aria-label="Search bus, route or stop" /></label><select className="filter-select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by GPS status"><option>All statuses</option><option>Demo GPS</option><option>GPS Online</option><option>GPS Offline</option></select>
        <div className="bus-location-list">{filtered.map((bus) => { const location = latestLocation(data.locations, bus.id); const state = trackingLabel(location); const route = data.routes.find((item) => item.id === bus.routeId); return <button className={`location-item ${selected?.id === bus.id ? 'selected' : ''}`} key={bus.id} onClick={() => setSelectedBusId(bus.id)}><span className="bus-list-icon"><LocateFixed size={16} /></span><span className="location-item-copy"><strong>{bus.busNumber}<small>{route?.name ?? 'No route'}</small></strong><span className={`status-chip ${state === 'Demo GPS' ? 'status-demo' : state === 'GPS Online' ? 'status-ok' : 'status-offline'}`}>{state}</span></span></button>; })}{filtered.length === 0 && <div className="empty-search">No buses match these filters.</div>}</div>
        {selected && <div className="selected-bus-card"><p className="eyebrow">SELECTED VEHICLE</p><div className="selected-bus-header"><strong>{selected.busNumber}</strong><span className="status-chip status-warn">{selected.status}</span></div><p>{selectedRoute?.name ?? 'Route not assigned'} · {selectedDriver?.fullName ?? 'No driver assigned'}</p><div className="selected-info-grid"><span>Last update<strong>{selectedLocation ? new Date(selectedLocation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'No location'}</strong></span><span>Source<strong>{selectedLocation?.source === 'demo' ? 'Demo GPS' : selectedLocation?.source === 'gps' ? 'Browser GPS' : 'Unavailable'}</strong></span><span>ETA<strong>Unavailable</strong></span><span>Signal<strong>{trackingLabel(selectedLocation) === 'GPS Offline' ? <><SignalZero size={13} /> Offline</> : <><Signal size={13} /> Active</>}</strong></span></div></div>}
      </aside>
    </div>
  </>;
}