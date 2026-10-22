import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BusFront, Check, CircleStop, MapPinned, Navigation, Play, Signal, SignalZero } from 'lucide-react';
import type { DemoState, GpsLocation, Trip } from '../types';
import { createId } from '../services/demoStore';
import { canStartBusTrip, latestLocation, trackingLabel } from '../utils/transit';

interface DriverPageProps { data: DemoState; onMutate: (change: (current: DemoState) => DemoState) => void; }

export default function DriverPage({ data, onMutate }: DriverPageProps) {
  const driver = data.drivers[0];
  const bus = data.buses.find((item) => item.assignedDriverId === driver?.id);
  const route = data.routes.find((item) => item.id === bus?.routeId);
  const trip = data.trips.find((item) => item.driverId === driver?.id && !item.endTime && item.status !== 'Completed' && item.status !== 'Cancelled');
  const location = bus ? latestLocation(data.locations, bus.id) : undefined;
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [noticeSent, setNoticeSent] = useState(false);
  const statusLabel = useMemo(() => trackingLabel(location), [location]);

  useEffect(() => {
    if (!sharing || !trip || trip.source !== 'demo') return;
    onMutate((current) => ({
      ...current,
      trips: current.trips.map((item) => item.id === trip.id ? { ...item, source: 'gps' } : item),
      locations: current.locations.filter((item) => item.tripId !== trip.id || item.source !== 'demo'),
    }));
  }, [sharing, trip?.id, trip?.source, onMutate]);

  useEffect(() => {
    if (!sharing || !trip || !bus || !driver) return;
    if (!navigator.geolocation) { setError('Geolocation is not supported by this browser.'); setSharing(false); return; }
    let lastWriteAt = 0;
    const watchId = navigator.geolocation.watchPosition((position) => {
      if (Date.now() - lastWriteAt < 5000) return;
      lastWriteAt = Date.now();
      const gpsLocation: GpsLocation = { busId: bus.id, driverId: driver.id, tripId: trip.id, latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, source: 'gps', timestamp: position.timestamp };
      onMutate((current) => ({ ...current, locations: [...current.locations.filter((item) => item.busId !== bus.id), gpsLocation] }));
      setError('');
    }, (geolocationError) => {
      const message = geolocationError.code === geolocationError.PERMISSION_DENIED ? 'Location permission was denied. Enable it in browser settings to share your position.' : geolocationError.code === geolocationError.POSITION_UNAVAILABLE ? 'Your location is currently unavailable.' : 'Location request timed out. Try again when you have a clear signal.';
      setError(message); setSharing(false);
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [sharing, trip?.id, bus?.id, driver?.id, onMutate]);

  function startTrip() {
    if (!bus || !driver || !route) return;
    if (!canStartBusTrip(data.trips, bus.id)) { setError('This bus already has an active trip.'); return; }
    const next: Trip = { id: createId('trip'), busId: bus.id, driverId: driver.id, routeId: route.id, startTime: Date.now(), status: 'On Time', source: 'demo' };
    onMutate((current) => ({ ...current, trips: [next, ...current.trips], drivers: current.drivers.map((item) => item.id === driver.id ? { ...item, availability: 'On trip' } : item) }));
    setError('');
  }

  function endTrip() {
    if (!trip) return;
    setSharing(false);
    onMutate((current) => ({ ...current, trips: current.trips.map((item) => item.id === trip.id ? { ...item, endTime: Date.now(), status: 'Completed' } : item), drivers: current.drivers.map((item) => item.id === driver?.id ? { ...item, availability: 'Available' } : item) }));
  }

  function reportDelay() {
    if (!bus || !route) return;
    onMutate((current) => ({ ...current, notifications: [{ id: createId('notice'), title: `${bus.busNumber} delay reported`, message: `Driver ${driver?.fullName} reported a delay on ${route.name}.`, category: 'Delay', audience: 'Everyone', targetBusId: bus.id, targetRouteId: route.id, createdAt: Date.now(), archived: false }, ...current.notifications] }));
    setNoticeSent(true); window.setTimeout(() => setNoticeSent(false), 3000);
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">DRIVER CONSOLE · DEMO ACCOUNT</p><h1>Ready for the road{driver ? `, ${driver.fullName.split(' ')[0]}` : ''}</h1><p className="heading-sub">Trip controls are limited to the assigned demo bus.</p></div><span className="status-chip status-demo">DEMO DRIVER</span></div>
    {!bus || !route ? <section className="panel empty-table"><AlertTriangle size={23} /><strong>No active vehicle assignment</strong><span>Contact a transport administrator to update your assignment.</span></section> : <>
      <div className="driver-console-grid"><section className="panel driver-trip-card"><div className="driver-vehicle-top"><span className="vehicle-icon large"><BusFront size={20} /></span><span className="status-chip status-ok">{bus.status}</span></div><p className="eyebrow">ASSIGNED VEHICLE</p><h2>{bus.busNumber}</h2><p className="driver-route-line"><MapPinned size={15} />{route.name}<span>·</span>{route.startPoint} to {route.destination}</p><div className="driver-trip-state"><span className={`trip-state-icon ${trip ? 'in-progress' : ''}`}>{trip ? <Navigation size={18} /> : <BusFront size={18} />}</span><span><small>TRIP STATUS</small><strong>{trip ? trip.status : 'Not started'}</strong></span><span className={`status-chip ${statusLabel === 'GPS Offline' ? 'status-offline' : statusLabel === 'Demo GPS' ? 'status-demo' : 'status-ok'}`}>{statusLabel}</span></div><div className="driver-controls">{!trip ? <button className="button button-primary touch-button" onClick={startTrip}><Play size={17} />Start trip</button> : <><button className={`button ${sharing ? 'button-quiet' : 'button-primary'} touch-button`} onClick={() => { setError(''); setSharing(!sharing); }}><Signal size={17} />{sharing ? 'Stop GPS sharing' : 'Start GPS sharing'}</button><button className="button button-outline touch-button" onClick={endTrip}><CircleStop size={17} />End trip</button></>}</div>{error && <div className="error-banner" role="alert"><AlertTriangle size={16} />{error}</div>}{noticeSent && <div className="success-banner"><Check size={15} />Delay report sent to the demo notice feed.</div>}<p className="gps-privacy-note">Real GPS uses this device’s location only after you start a trip and choose Start GPS sharing. Positions stay in local demo storage.</p></section>
        <section className="panel stop-list-panel"><div className="panel-heading"><div><p className="eyebrow">ORDERED STOPS</p><h2>{route.name}</h2></div><span className="count-badge">{route.stops.length}</span></div><div className="driver-stop-list">{route.stops.map((stop, index) => <div className="driver-stop" key={stop.id}><span className={`stop-number ${index === 0 && trip ? 'stop-current' : ''}`}>{String(index + 1).padStart(2, '0')}</span><span><strong>{stop.name}</strong><small>{index === 0 ? 'Starting point' : 'Scheduled stop'}</small></span><time>{stop.plannedArrivalTime}</time></div>)}</div><button className="button button-outline report-delay-button" onClick={reportDelay}>Report a delay</button></section></div>
      <div className="driver-bottom-grid"><section className="panel gps-state-card"><div className="panel-heading"><div><p className="eyebrow">LOCATION SHARING</p><h2>GPS status</h2></div>{sharing ? <Signal size={18} className="gps-online-icon" /> : <SignalZero size={18} className="soft-icon" />}</div><div className="gps-status-line"><span className={`gps-status-light ${sharing ? 'live' : ''}`} /><strong>{sharing ? 'Sharing browser location' : 'Not sharing'}</strong></div><p>{location ? `Last update ${new Date(location.timestamp).toLocaleTimeString()} · accuracy ±${Math.round(location.accuracy)} m · ${location.source === 'gps' ? 'Browser GPS' : 'Demo GPS'}` : 'No location has been published for this trip.'}</p></section><section className="panel driver-notices"><div className="panel-heading"><div><p className="eyebrow">FOR YOUR ROUTE</p><h2>Service notices</h2></div></div>{data.notifications.filter((item) => !item.archived && (!item.targetRouteId || item.targetRouteId === route.id)).slice(0, 2).map((item) => <div className="driver-notice-row" key={item.id}><span className="notice-mark delay" /><div><strong>{item.title}</strong><small>{item.message}</small></div></div>)}</section></div>
    </>}
  </>;
}