import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Bell, BusFront, CalendarDays, ChevronDown, LayoutDashboard, LogOut, MapPinned, Menu, Route as RouteIcon, Settings2, Users, X } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import type { DemoState, UserRole } from './types';
import { loadDemoState, resetDemoState, saveDemoState } from './services/demoStore';
import DashboardPage from './pages/DashboardPage';
import TrackingPage from './pages/TrackingPage';
import FleetPage from './pages/FleetPage';
import OperationsPage from './pages/OperationsPage';
import StudentsPage from './pages/StudentsPage';
import NoticesPage from './pages/NoticesPage';
import ReportsPage from './pages/ReportsPage';
import DriverPage from './pages/DriverPage';
import DriversPage from './pages/DriversPage';
import type { GpsLocation } from './types';

type AppPath = '/overview' | '/tracking' | '/fleet' | '/drivers' | '/operations' | '/students' | '/notices' | '/reports' | '/driver';
const roleStorageKey = 'campus-transit-demo-role';
const allNavigation: { path: AppPath; label: string; icon: typeof LayoutDashboard; roles: UserRole[] }[] = [
  { path: '/overview', label: 'Overview', icon: LayoutDashboard, roles: ['Admin', 'Student'] },
  { path: '/tracking', label: 'Live tracking', icon: MapPinned, roles: ['Admin', 'Student', 'Driver'] },
  { path: '/fleet', label: 'Bus fleet', icon: BusFront, roles: ['Admin'] },
  { path: '/drivers', label: 'Drivers', icon: Users, roles: ['Admin'] },
  { path: '/operations', label: 'Routes & schedules', icon: CalendarDays, roles: ['Admin'] },
  { path: '/students', label: 'Students', icon: Users, roles: ['Admin'] },
  { path: '/notices', label: 'Notices', icon: Bell, roles: ['Admin', 'Student', 'Driver'] },
  { path: '/reports', label: 'Reports', icon: Activity, roles: ['Admin'] },
  { path: '/driver', label: 'Driver console', icon: RouteIcon, roles: ['Driver'] },
];

export default function App() {
  return <BrowserRouter><TransitWorkspace /></BrowserRouter>;
}

function TransitWorkspace() {
  const [data, setData] = useState<DemoState>(() => loadDemoState());
  const dataRef = useRef(data);
  const [role, setRole] = useState<UserRole>(() => {
    const stored = sessionStorage.getItem(roleStorageKey);
    return stored === 'Student' || stored === 'Driver' ? stored : 'Admin';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const simulationSteps = useRef<Record<string, number>>({});
  const location = useLocation();
  const navigate = useNavigate();

  const mutate = useCallback((change: (current: DemoState) => DemoState) => {
    const next = change(dataRef.current);
    dataRef.current = next;
    setData(next);
    saveDemoState(next);
  }, []);

  useEffect(() => {
    const syncStorage = (event: StorageEvent) => {
      if (event.key === 'campus-transit-demo-v1') {
        const next = loadDemoState(); dataRef.current = next; setData(next);
      }
    };
    window.addEventListener('storage', syncStorage);
    return () => window.removeEventListener('storage', syncStorage);
  }, []);

  useEffect(() => {
    if (!simulating) return;
    const interval = window.setInterval(() => {
      const current = dataRef.current;
      const activeTrips = current.trips.filter((trip) => !trip.endTime && trip.status !== 'Cancelled' && trip.source === 'demo');
      if (activeTrips.length === 0) return;
      const locations = [...current.locations];
      for (const trip of activeTrips) {
        const route = current.routes.find((item) => item.id === trip.routeId);
        if (!route || route.coordinates.length === 0) continue;
        const step = ((simulationSteps.current[trip.id] ?? 0) + 1) % route.coordinates.length;
        simulationSteps.current[trip.id] = step;
        const [latitude, longitude] = route.coordinates[step];
        const nextLocation: GpsLocation = { busId: trip.busId, driverId: trip.driverId, tripId: trip.id, latitude, longitude, accuracy: 12, source: 'demo', timestamp: Date.now() };
        const existingIndex = locations.findIndex((item) => item.busId === trip.busId);
        if (existingIndex >= 0) locations[existingIndex] = nextLocation; else locations.push(nextLocation);
      }
      mutate((latest) => ({ ...latest, locations }));
    }, 4000);
    return () => window.clearInterval(interval);
  }, [simulating, mutate]);

  const navigation = allNavigation.filter((item) => item.roles.includes(role));
  const homePath: AppPath = role === 'Driver' ? '/driver' : '/overview';
  const currentItem = allNavigation.find((item) => item.path === location.pathname);
  const routeAllowed = navigation.some((item) => item.path === location.pathname);
  const pageTitle = currentItem?.label ?? 'Overview';

  function changeRole(nextRole: UserRole) {
    setRole(nextRole); sessionStorage.setItem(roleStorageKey, nextRole); setProfileMenuOpen(false);
    navigate(nextRole === 'Driver' ? '/driver' : '/overview');
    toast.info(`Demo view switched to ${nextRole}. This is not an authenticated account.`);
  }

  function resetDemo() {
    if (!window.confirm('Reset all local demo changes and restore the sample dataset?')) return;
    setSimulating(false);
    const reset = resetDemoState(); dataRef.current = reset; setData(reset);
    toast.success('Local demo data restored.');
  }

  function toggleSimulation() {
    const next = !simulating;
    if (next && !dataRef.current.trips.some((trip) => !trip.endTime && trip.status !== 'Cancelled' && trip.source === 'demo')) {
      toast.error('There is no active demo trip. Start a demo trip from the Driver console first.'); return;
    }
    setSimulating(next);
    toast.info(next ? 'Demo GPS simulation started.' : 'Demo GPS simulation paused.');
  }

  function resetPositions() {
    setSimulating(false);
    simulationSteps.current = {};
    mutate((current) => ({
      ...current,
      locations: current.locations.map((location) => {
        if (location.source !== 'demo') return location;
        const trip = current.trips.find((item) => item.id === location.tripId);
        const route = current.routes.find((item) => item.id === trip?.routeId);
        const firstPoint = route?.coordinates[0];
        return firstPoint ? { ...location, latitude: firstPoint[0], longitude: firstPoint[1], timestamp: Date.now() } : location;
      }),
    }));
    toast.success('Demo positions reset.');
  }

  return <div className="app-frame">
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
      <div className="brand-lockup"><div className="brand-mark"><BusFront size={21} strokeWidth={2.3} /></div><div><strong>Campus Transit</strong><span>TRANSPORT OPERATIONS</span></div><button className="icon-button close-mobile-nav" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
      <div className="workspace-label">WORKSPACE</div><nav aria-label="Main navigation">{navigation.map(({ path, label, icon: Icon }) => <NavLink key={path} to={path} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={17} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="college-mark"><span className="college-seal">N</span><span><strong>Northfield College</strong><small>Transportation</small></span></div><div className="demo-note"><i className="status-dot" /> LOCAL DEMO STORAGE</div>{role === 'Admin' && <button className="sidebar-reset" onClick={resetDemo}><Settings2 size={14} />Reset demo data</button>}</div>
    </aside>

    {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} />}
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><div className="crumb"><span>Campus Transit</span><b>/</b><strong>{pageTitle}</strong></div><div className="topbar-actions"><span className="demo-pill"><i className="status-dot" />DEMO MODE</span><div className="profile-wrap"><button className="profile-button" onClick={() => setProfileMenuOpen(!profileMenuOpen)} aria-expanded={profileMenuOpen}><span className="avatar">{role === 'Admin' ? 'AR' : role === 'Student' ? 'AR' : 'MC'}</span><span className="profile-copy"><strong>{role === 'Admin' ? 'Alex Rivera' : role === 'Student' ? 'Alex Rivera' : 'Morgan Chen'}</strong><small>{role} · demo view</small></span><ChevronDown size={14} /></button>{profileMenuOpen && <div className="profile-menu"><span className="menu-eyebrow">SWITCH DEMO VIEW</span>{(['Admin', 'Student', 'Driver'] as UserRole[]).map((option) => <button key={option} className={role === option ? 'current' : ''} onClick={() => changeRole(option)}>{option}{role === option && <i className="status-dot" />}</button>)}<div className="profile-menu-separator" /><button onClick={() => { setProfileMenuOpen(false); toast.info('Demo mode has no signed-in account to log out.'); }}><LogOut size={14} />Log out</button></div>}</div></div></header>
      <div className="page-content">
        <Routes>
          <Route path="/overview" element={role === 'Driver' ? <Navigate to="/driver" replace /> : <DashboardPage data={data} role={role} onNavigate={(view) => navigate(`/${view}`)} />} />
          <Route path="/tracking" element={<TrackingPage data={data} simulating={simulating} onToggleSimulation={toggleSimulation} onResetSimulation={resetPositions} />} />
          <Route path="/fleet" element={<FleetPage data={data} onMutate={mutate} />} />
          <Route path="/drivers" element={<DriversPage data={data} onMutate={mutate} />} />
          <Route path="/operations" element={<OperationsPage data={data} onMutate={mutate} />} />
          <Route path="/students" element={<StudentsPage data={data} />} />
          <Route path="/notices" element={<NoticesPage data={data} role={role} onMutate={mutate} />} />
          <Route path="/reports" element={<ReportsPage data={data} />} />
          <Route path="/driver" element={<DriverPage data={data} onMutate={mutate} />} />
          <Route path="*" element={<Navigate to={homePath} replace />} />
        </Routes>
        {!routeAllowed && location.pathname !== '/' && <Navigate to={homePath} replace />}
      </div>
      <footer className="app-footer"><span>Northfield College · Transportation</span><span>Local demo data is saved in this browser.</span></footer>
    </main>
    <Toaster position="bottom-right" richColors closeButton />
  </div>;
}