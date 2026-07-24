import { Component, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { runtime, ApiError } from './api';
import { useAuth } from './auth';
import { ptcLogoDataUri } from './logo';
import { Link, navigate, useRouter } from './router';
import type { Camera, HealthState, Outcome, ReviewStatus } from './types';
import { formatRelativeTime } from './utils';

export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'square' as const, strokeLinejoin: 'miter' as const, 'aria-hidden': true };
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    camera: <><path d="M4 7h3l1.5-2h7L17 7h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><rect x="3" y="4" width="2" height="2"/><rect x="3" y="10" width="2" height="2"/><rect x="3" y="16" width="2" height="2"/></>,
    pulse: <><path d="M3 12h4l2-5 4 10 2-5h6"/><path d="M4 4h16v16H4z"/></>,
    report: <><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h5M8 12h8M8 16h8"/></>, bell: <><path d="M6 9a6 6 0 0 1 12 0v5l2 2H4l2-2z"/><path d="M10 19h4"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>, arrow: <path d="M5 12h14M14 7l5 5-5 5"/>, back: <path d="M19 12H5M10 7l-5 5 5 5"/>,
    download: <><path d="M12 3v12M8 11l4 4 4-4"/><path d="M4 19h16"/></>, print: <><path d="M7 8V3h10v5M7 17h10v4H7z"/><path d="M5 9h14a2 2 0 0 1 2 2v5h-4v-3H7v3H3v-5a2 2 0 0 1 2-2z"/></>,
    close: <path d="M5 5l14 14M19 5 5 19"/>, check: <path d="M5 12l4 4L19 6"/>, warning: <><path d="M12 3 2 21h20z"/><path d="M12 9v5M12 18h.01"/></>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></>, logout: <><path d="M10 4H4v16h6M14 8l4 4-4 4M9 12h9"/></>, refresh: <><path d="M20 11a8 8 0 1 0-2 5"/><path d="M20 4v7h-7"/></>,
    chevronLeft: <path d="m15 18-6-6 6-6"/>, chevronRight: <path d="m9 18 6-6-6-6"/>, sort: <><path d="m8 9 4-4 4 4M16 15l-4 4-4-4"/></>,
    eye: <><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></>, eyeOff: <><path d="m3 3 18 18"/><path d="M10.6 6.2A11 11 0 0 1 12 6c6 0 10 6 10 6a18 18 0 0 1-2.1 2.7M6.6 6.6C3.8 8.5 2 12 2 12s4 6 10 6a10.7 10.7 0 0 0 4-.8"/></>,
    lock: <><rect x="5" y="10" width="14" height="11"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>, external: <><path d="M14 3h7v7M10 14 21 3"/><path d="M21 14v7H3V3h7"/></>,
  };
  return <svg {...common}>{paths[name] ?? paths.grid}</svg>;
}

export type Tone = 'good' | 'warn' | 'bad' | 'neutral' | 'info';
export function StatusPill({ label, tone }: { label: string; tone: Tone }) { return <span className={`status-pill status-pill--${tone}`}><span className="status-pill__dot" />{label}</span>; }
export function outcomeTone(outcome: Outcome): Tone { if (outcome === 'completed') return 'good'; if (outcome === 'missed') return 'bad'; if (outcome === 'incomplete') return 'warn'; return 'neutral'; }
export function reviewTone(status: ReviewStatus): Tone { if (status === 'confirmed') return 'good'; if (status === 'dismissed') return 'neutral'; return 'info'; }
export function healthTone(state: HealthState): Tone { if (state === 'healthy') return 'good'; if (state === 'warning') return 'warn'; if (state === 'critical') return 'bad'; return 'neutral'; }

const NAV_ITEMS = [
  { path: '/overview', label: 'Overview', icon: 'grid' }, { path: '/live', label: 'Live Monitoring', icon: 'camera' }, { path: '/events', label: 'Events', icon: 'list' }, { path: '/health', label: 'System Health', icon: 'pulse' }, { path: '/reports', label: 'Reports', icon: 'report' },
] as const;

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => { const onOnline = () => setOnline(true); const onOffline = () => setOnline(false); window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline); return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); }; }, []);
  return online;
}

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { pathname } = useRouter(); const { user, logout } = useAuth(); const online = useOnlineStatus();
  useEffect(() => { document.title = `${title} · PTC Bale Inspection Monitor`; }, [title]);
  function performLogout() { logout(); navigate('/login', { replace: true }); }
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <aside className="sidebar">
      <div className="sidebar__brand"><img src={ptcLogoDataUri} alt="PTC" /><div><strong>Bale Inspection</strong><span>Monitoring System</span></div></div>
      <nav className="sidebar__nav" aria-label="Primary navigation">{NAV_ITEMS.map((item) => { const active = pathname === item.path || (item.path === '/events' && pathname.startsWith('/events/')); return <Link key={item.path} to={item.path} className={active ? 'nav-item nav-item--active' : 'nav-item'} ariaCurrent={active ? 'page' : undefined}><Icon name={item.icon} /><span>{item.label}</span></Link>; })}</nav>
      <div className="sidebar__footer"><div className="environment-card"><span className="environment-card__label">Environment</span><strong>{runtime.environmentName}</strong><span>{runtime.dataMode === 'mock' ? 'Synthetic PoC data' : 'Live API mode'}</span></div>
        <button className="sidebar-user" type="button" onClick={performLogout} aria-label={`Sign out ${user?.displayName ?? ''}`}><span className="sidebar-user__avatar"><Icon name="user" size={20} /></span><span><strong>{user?.displayName}</strong><small>{user?.role}</small></span><Icon name="logout" size={18} /></button>
      </div>
    </aside>
    <div className="workspace"><header className="topbar"><div><span className="topbar__context">PTC · Pakistan Standard Time</span><h1 tabIndex={-1}>{title}</h1></div><div className="topbar__actions"><StatusPill label={runtime.dataMode === 'mock' ? 'Mock data' : 'Live data'} tone={runtime.dataMode === 'mock' ? 'info' : 'good'} /><span className="build-label">v{runtime.buildVersion}</span></div></header>
      <div className="system-strip" role="status" aria-live="polite"><div><span className={`strip-dot ${online ? 'strip-dot--good' : 'strip-dot--bad'}`} /><strong>Browser network</strong><span>{online ? 'Online' : 'Offline'}</span></div><div><span className="strip-dot strip-dot--good" /><strong>Local System</strong><span>Available</span></div><div><span className="strip-dot strip-dot--neutral" /><strong>Azure Sync</strong><span>Not configured</span></div><div className="system-strip__time">{runtime.dataMode === 'mock' ? 'Production UI · mock provider' : 'Connected provider'}</div></div>
      <main className="content" id="main-content">{!online && <div className="offline-banner" role="alert"><Icon name="warning" size={20} /><span>You are offline. Cached screen data remains visible where available; changes require reconnection.</span></div>}{children}</main>
    </div>
  </div>;
}

export function CameraScene({ camera }: { camera: Camera }) {
  const degraded = camera.status !== 'online' || camera.aiStatus !== 'processing';
  return <div className={`camera-scene ${degraded ? 'camera-scene--degraded' : ''}`} aria-label={`Synthetic preview for ${camera.name}`}><div className="camera-scene__grid"/><div className="conveyor"/><div className="bale bale--one"><span>BALE</span></div><div className="bale bale--two"><span>BALE</span></div><div className="worker worker--one"><span/></div><div className="worker worker--two"><span/></div><div className="tracking-box tracking-box--bale"><span>Bale 0.94</span></div><div className="tracking-box tracking-box--worker"><span>Worker 0.91</span></div><span className="camera-id-overlay">{camera.id}</span><span className="camera-mode-overlay">MOCK FEED</span>{degraded && <span className="camera-warning-overlay">DEGRADED</span>}</div>;
}

export function LoadingPanel({ label = 'Loading data…', rows = 3 }: { label?: string; rows?: number }) { return <div className="loading-panel" role="status" aria-live="polite" aria-label={label}>{Array.from({ length: rows }, (_, index) => <span className="skeleton-line" key={index}/>)}<span className="sr-only">{label}</span></div>; }
export function EmptyState({ title, message }: { title: string; message: string }) { return <div className="empty-state"><Icon name="list" size={34}/><h3>{title}</h3><p>{message}</p></div>; }
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) { const apiError = error instanceof ApiError ? error : null; return <div className="error-state" role="alert"><Icon name="warning" size={30}/><div><h3>Unable to load this information</h3><p>{apiError?.message ?? (error instanceof Error ? error.message : 'An unexpected error occurred.')}</p>{apiError?.correlationId && <small>Reference: {apiError.correlationId}</small>}</div>{onRetry && <button className="button button--secondary" type="button" onClick={onRetry}><Icon name="refresh" size={18}/> Retry</button>}</div>; }
export function Freshness({ updatedAt, isFetching, isStale }: { updatedAt: number; isFetching: boolean; isStale: boolean }) { return <span className="freshness" aria-live="polite">{isFetching ? 'Refreshing…' : updatedAt ? `Updated ${formatRelativeTime(new Date(updatedAt).toISOString())}` : 'Not loaded'}{isStale && !isFetching ? ' · stale' : ''}</span>; }

export function Pagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange, disabled }: { page: number; totalPages: number; total: number; pageSize: number; onPageChange: (page: number) => void; onPageSizeChange: (pageSize: number) => void; disabled?: boolean; }) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1; const end = Math.min(page * pageSize, total);
  return <div className="pagination" aria-label="Event pagination"><span>{start}–{end} of {total}</span><label><span>Rows</span><select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} disabled={disabled}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></label><div className="pagination__buttons"><button className="icon-button" type="button" onClick={() => onPageChange(page - 1)} disabled={disabled || page <= 1} aria-label="Previous page"><Icon name="chevronLeft"/></button><span>Page {page} of {totalPages}</span><button className="icon-button" type="button" onClick={() => onPageChange(page + 1)} disabled={disabled || page >= totalPages} aria-label="Next page"><Icon name="chevronRight"/></button></div></div>;
}

interface ToastMessage { id: number; message: string; tone: Tone; }
interface ToastContextValue { pushToast: (message: string, tone?: Tone) => void; }
const ToastContext = createContext<ToastContextValue | null>(null);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]); const timers = useRef(new Map<number, number>());
  useEffect(() => { const activeTimers = timers.current; return () => { for (const timeout of activeTimers.values()) window.clearTimeout(timeout); activeTimers.clear(); }; }, []);
  const pushToast = useCallback((message: string, tone: Tone = 'good') => { const id = Date.now() + Math.random(); setToasts((current) => [...current, { id, message, tone }]); const timeout = window.setTimeout(() => { setToasts((current) => current.filter((toast) => toast.id !== id)); timers.current.delete(id); }, 4500); timers.current.set(id, timeout); }, []);
  const value = useMemo(() => ({ pushToast }), [pushToast]);
  return <ToastContext.Provider value={value}>{children}<div className="toast-region" aria-live="polite" aria-label="Notifications">{toasts.map((toast) => <div key={toast.id} className={`toast toast--${toast.tone}`}><Icon name={toast.tone === 'bad' ? 'warning' : 'check'} size={18}/>{toast.message}</div>)}</div></ToastContext.Provider>;
}
export function useToast(): ToastContextValue { const value = useContext(ToastContext); if (!value) throw new Error('useToast must be used within ToastProvider.'); return value; }

interface ErrorBoundaryState { error?: Error; }
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = {};
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { error }; }
  override componentDidCatch(error: Error, info: ErrorInfo): void { console.error('Dashboard error boundary', { error, componentStack: info.componentStack }); }
  override render() { if (this.state.error) return <main className="fatal-error"><img src={ptcLogoDataUri} alt="PTC"/><h1>Dashboard could not be displayed</h1><p>{this.state.error.message}</p><button className="button button--primary" type="button" onClick={() => window.location.reload()}>Reload application</button></main>; return this.props.children; }
}
