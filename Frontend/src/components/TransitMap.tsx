import { useMemo } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip } from 'react-leaflet';
import type { Bus, Driver, GpsLocation, TransitRoute } from '../types';
import { latestLocation, trackingLabel } from '../utils/transit';

interface TransitMapProps {
  buses: Bus[];
  drivers: Driver[];
  routes: TransitRoute[];
  locations: GpsLocation[];
  selectedBusId?: string;
  onSelectBus?: (busId: string) => void;
}

const busIcon = L.divIcon({
  className: 'bus-map-icon-wrap',
  html: '<span class="bus-map-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16V6.8A2.8 2.8 0 0 1 7.8 4h8.4A2.8 2.8 0 0 1 19 6.8V16m-14 0h14m-14 0v2.2A1.8 1.8 0 0 0 6.8 20h.4A1.8 1.8 0 0 0 9 18.2V16m6 0v2.2a1.8 1.8 0 0 0 1.8 1.8h.4a1.8 1.8 0 0 0 1.8-1.8V16M5 9h14m-11 4h.01M16 13h.01"/></svg></span>',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

export default function TransitMap({ buses, drivers, routes, locations, selectedBusId, onSelectBus }: TransitMapProps) {
  const mapCenter = useMemo<[number, number]>(() => routes[0]?.coordinates[0] ?? [12.98, 77.60], [routes]);

  return (
    <MapContainer center={mapCenter} zoom={13} scrollWheelZoom className="transit-map" aria-label="Map of sample campus bus routes">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {routes.filter((route) => route.active).map((route) => (
        <Polyline key={route.id} positions={route.coordinates} pathOptions={{ color: route.id === routes[0]?.id ? '#1b7180' : '#567f9d', weight: 4, opacity: 0.68, dashArray: '7 7' }}>
          <Tooltip sticky>{route.name} · sample route geometry</Tooltip>
        </Polyline>
      ))}
      {routes.flatMap((route) => route.stops.map((stop) => (
        <CircleMarker key={stop.id} center={[stop.latitude, stop.longitude]} radius={5} pathOptions={{ color: '#fff', fillColor: '#cf704e', fillOpacity: 1, weight: 2 }}>
          <Popup><strong>{stop.name}</strong><br />{route.name} · planned {stop.plannedArrivalTime}</Popup>
        </CircleMarker>
      )))}
      {buses.map((bus) => {
        const location = latestLocation(locations, bus.id);
        const route = routes.find((item) => item.id === bus.routeId);
        const driver = drivers.find((item) => item.id === bus.assignedDriverId);
        if (!location) return null;
        const selected = selectedBusId === bus.id;
        return (
          <Marker key={bus.id} position={[location.latitude, location.longitude]} icon={busIcon} eventHandlers={{ click: () => onSelectBus?.(bus.id) }} zIndexOffset={selected ? 900 : 500}>
            <Popup>
              <div className="map-popup"><strong>{bus.busNumber}</strong><span>{route?.name ?? 'Unassigned route'}</span><span>{driver?.fullName ?? 'No driver assigned'}</span><b>{trackingLabel(location)} · {new Date(location.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b></div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}