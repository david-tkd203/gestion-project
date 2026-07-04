import { useState, createContext, useContext, Suspense, lazy, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, NavLink } from 'react-router-dom';
import anime from 'animejs';
import { isAuthed, logout, MeUser, getMe } from './api';
import { LayoutDashboard, KanbanIcon, TrendingUp, Calendar, LogOut, DiagramIcon, GitBranch, Loader2, MapPin } from './icons';
import ThreeBackground from './ThreeBackground';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Kanban = lazy(() => import('./pages/Kanban'));
const SprintStatus = lazy(() => import('./pages/SprintStatus'));
const Gantt = lazy(() => import('./pages/Gantt'));
const SprintFlow = lazy(() => import('./pages/SprintFlow'));
const Login = lazy(() => import('./pages/Login'));
const BpmnPage = lazy(() => import('./pages/BpmnPage'));
const GameMapPage = lazy(() => import('./pages/GameMapPage'));
const GitHubPage = lazy(() => import('./pages/GitHubPage'));

interface AuthCtx {
  token: string | null;
  setToken: (t: string | null) => void;
  me: MeUser | null;
  setMe: (m: MeUser | null) => void;
}
const AuthContext = createContext<AuthCtx>({
  token: null,
  setToken: () => {},
  me: null,
  setMe: () => {},
});
export const useAuth = () => useContext(AuthContext);
export const useMe = () => useContext(AuthContext).me;

function Loading() { return <div className="loading"><Loader2 className="spinner" /> Cargando...</div>; }

function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (!ref.current) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Skip animation on first mount — only transition between routes
    if (first.current) { first.current = false; return; }
    const tl = anime.timeline({ easing: 'easeInOutQuad' });
    tl.add({ targets: ref.current, opacity: [1, 0], scale: [1, 0.98], duration: 200 })
      .add({ targets: ref.current, opacity: [0, 1], scale: [0.98, 1], duration: 200 });
    return () => anime.remove(ref.current);
  }, [pathname]);
  return <div ref={ref}>{children}</div>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'));
  const [me, setMe] = useState<MeUser | null>(null);
  const actualSetToken = (t: string | null) => {
    if (t) localStorage.setItem('access_token', t);
    else localStorage.removeItem('access_token');
    setToken(t);
  };
  useEffect(() => {
    if (isAuthed()) {
      getMe().then(setMe).catch(() => setMe(null));
    } else {
      setMe(null);
    }
  }, [token]);
  return (
    <AuthContext.Provider value={{ token, setToken: actualSetToken, me, setMe }}>
      {/* ThreeBackground only when logged in */}
      {isAuthed() && <ThreeBackground color="#0d9488" />}
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={isAuthed() ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/*" element={<ProtectedRoute><Layout /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </AuthContext.Provider>
  );
}

function Layout() {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/kanban', label: 'Kanban', icon: KanbanIcon },
    { to: '/sprint', label: 'Sprint Status', icon: TrendingUp },
    { to: '/flow', label: 'Cronograma', icon: Calendar },
    { to: '/gantt', label: 'Gantt', icon: GitBranch },
    { to: '/bpmn', label: 'BPMN', icon: DiagramIcon },
    { to: '/mapa', label: 'Mapa', icon: MapPin },
    { to: '/github', label: 'GitHub', icon: GitBranch },
  ];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <KanbanIcon />
            <div><h1>VINCULOmaster</h1><small>Gestion de proyectos</small></div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              className={({ isActive }) => isActive ? 'active' : ''}>
              <item.icon /><span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn-ghost" onClick={() => { logout(); }} style={{ width: '100%', justifyContent: 'center' }}>
            <LogOut /> <span>Cerrar sesion</span>
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Suspense fallback={<Loading />}>
          <PageTransition>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/kanban" element={<Kanban />} />
              <Route path="/sprint" element={<SprintStatus />} />
              <Route path="/sprint/:id" element={<SprintStatus />} />
              <Route path="/flow" element={<SprintFlow />} />
              <Route path="/gantt" element={<Gantt />} />
              <Route path="/bpmn" element={<BpmnPage />} />
              <Route path="/mapa" element={<GameMapPage />} />
              <Route path="/github" element={<GitHubPage />} />
            </Routes>
          </PageTransition>
        </Suspense>
      </main>
    </div>
  );
}
