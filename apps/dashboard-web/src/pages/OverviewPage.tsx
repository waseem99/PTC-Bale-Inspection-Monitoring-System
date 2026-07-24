import { api } from '../api';
import { useAuth } from '../auth';
import { AppShell, CameraScene, ErrorState, Freshness, Icon, LoadingPanel, StatusPill, outcomeTone, reviewTone } from '../components';
import { useQuery } from '../query';
import { Link } from '../router';
import type { EventQuery } from '../types';
import { formatDateTime } from '../utils';

const RECENT_QUERY: EventQuery = { page: 1, pageSize: 5, sortBy: 'timestamp', sortDirection: 'desc' };

export default function OverviewPage() {
  const { session } = useAuth(); const token = session?.token ?? '';
  const summary = useQuery({ key: 'summary', enabled: Boolean(session), staleTime: 30_000, refetchInterval: 60_000, queryFn: (signal) => api.getSummary(token, signal) });
  const cameras = useQuery({ key: 'cameras', enabled: Boolean(session), staleTime: 5_000, refetchInterval: 10_000, queryFn: (signal) => api.getCameras(token, signal) });
  const recentEvents = useQuery({ key: 'events:recent', enabled: Boolean(session), staleTime: 15_000, refetchInterval: 30_000, queryFn: (signal) => api.getEvents(token, RECENT_QUERY, signal) });
  return <AppShell title="Overview">
    <section className="page-intro"><div><span className="eyebrow">Operational overview</span><h2 tabIndex={-1}>Inspection operations at a glance</h2><p>Monitor inspection outcomes, evidence review and system readiness from one operational view.</p></div><div className="page-intro__actions"><Freshness updatedAt={summary.updatedAt} isFetching={summary.isFetching} isStale={summary.isStale}/><button className="button button--secondary" type="button" onClick={() => void summary.refetch()} disabled={summary.isFetching}><Icon name="refresh" size={18}/> Refresh</button><Link className="button button--primary" to="/live">Open live monitoring <Icon name="arrow" size={18}/></Link></div></section>
    {summary.isLoading && <LoadingPanel rows={4} label="Loading dashboard summary"/>}{summary.error && !summary.data && <ErrorState error={summary.error} onRetry={() => void summary.refetch()}/>} 
    {summary.data && <section className="kpi-grid" aria-label="Inspection key performance indicators"><article className="kpi-card kpi-card--primary"><span>Total inspections</span><strong>{summary.data.total}</strong><small>{summary.data.periodLabel}</small></article><article className="kpi-card"><span>Completed</span><strong>{summary.data.completed}</strong><small>{summary.data.completedRate}% completion rate</small></article><article className="kpi-card kpi-card--warning"><span>Missed / incomplete</span><strong>{summary.data.violations}</strong><small>Requires process attention</small></article><article className="kpi-card"><span>Unreviewed</span><strong>{summary.data.unreviewed}</strong><small>Supervisor queue</small></article></section>}
    <section className="dashboard-grid"><article className="panel panel--wide"><div className="panel__header"><div><span className="eyebrow">Camera network</span><h3>Live monitoring status</h3></div><Link to="/live">View all cameras <Icon name="arrow" size={17}/></Link></div>
      {cameras.isLoading && <LoadingPanel rows={3} label="Loading camera status"/>}{cameras.error && !cameras.data && <ErrorState error={cameras.error} onRetry={() => void cameras.refetch()}/>} 
      {cameras.data && <div className="camera-mini-grid">{cameras.data.map((camera) => <article className="camera-mini-card" key={camera.id}><CameraScene camera={camera}/><div className="camera-card__body"><div><strong>{camera.name}</strong><span>{camera.zone}</span></div><StatusPill label={camera.status} tone={camera.status === 'online' ? 'good' : camera.status === 'warning' ? 'warn' : 'bad'}/></div></article>)}</div>}
    </article><article className="panel"><div className="panel__header"><div><span className="eyebrow">Review queue</span><h3>Recent events</h3></div><Link to="/events">View all</Link></div>
      {recentEvents.isLoading && <LoadingPanel rows={5} label="Loading recent events"/>}{recentEvents.error && !recentEvents.data && <ErrorState error={recentEvents.error} onRetry={() => void recentEvents.refetch()}/>} 
      {recentEvents.data && <div className="event-list-compact">{recentEvents.data.items.map((event) => <Link key={event.id} to={`/events/${encodeURIComponent(event.id)}`} className="event-compact-row"><div><strong>{event.id}</strong><span>{event.cameraName} · {formatDateTime(event.timestamp)}</span></div><div><StatusPill label={event.outcome} tone={outcomeTone(event.outcome)}/><StatusPill label={event.reviewStatus} tone={reviewTone(event.reviewStatus)}/></div></Link>)}</div>}
    </article></section>
  </AppShell>;
}
