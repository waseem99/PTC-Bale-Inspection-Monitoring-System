import { api } from '../api';
import { useAuth } from '../auth';
import { AppShell, ErrorState, Freshness, Icon, LoadingPanel, StatusPill, healthTone } from '../components';
import { useQuery } from '../query';
import { formatDateTime } from '../utils';

export default function HealthPage() {
  const { session } = useAuth(); const token = session?.token ?? '';
  const health = useQuery({ key: 'health', enabled: Boolean(token), staleTime: 5_000, refetchInterval: 10_000, queryFn: (signal) => api.getHealth(token, signal) });
  return <AppShell title="System Health">
    <section className="page-intro"><div><span className="eyebrow">Local-first operations</span><h2 tabIndex={-1}>Infrastructure and service readiness</h2><p>Monitor the local edge, AI runtime, GPU, storage, database and optional Azure synchronization separately.</p></div><div className="page-intro__actions"><Freshness updatedAt={health.updatedAt} isFetching={health.isFetching} isStale={health.isStale}/><button className="button button--secondary" type="button" onClick={() => void health.refetch()} disabled={health.isFetching}><Icon name="refresh" size={18}/> Refresh</button></div></section>
    {health.isLoading && <LoadingPanel rows={6} label="Loading system health"/>}
    {health.error && !health.data && <ErrorState error={health.error} onRetry={() => void health.refetch()}/>} 
    {health.data && <><section className="health-grid" aria-label="System health metrics">{health.data.map((metric) => <article className={`health-card health-card--${metric.state}`} key={metric.id}><div className="health-card__header"><span className="health-icon"><Icon name={metric.id === 'gpu' ? 'pulse' : metric.id === 'azure' ? 'external' : 'check'} size={22}/></span><StatusPill label={metric.state} tone={healthTone(metric.state)}/></div><span>{metric.label}</span><strong>{metric.value}</strong><p>{metric.detail}</p><small>Checked {formatDateTime(metric.checkedAt)}</small></article>)}</section>
      <section className="panel health-notes"><div className="panel__header"><div><span className="eyebrow">Operational principle</span><h3>Local operation remains primary</h3></div></div><div className="health-note-grid"><div><Icon name="check" size={22}/><span><strong>Inspection processing</strong> continues on the local GPU workstation.</span></div><div><Icon name="check" size={22}/><span><strong>Evidence generation</strong> remains available without internet connectivity.</span></div><div><Icon name="check" size={22}/><span><strong>Dashboard access</strong> is served on the client network.</span></div><div><Icon name="external" size={22}/><span><strong>Azure services</strong> may add central access and synchronization after approval.</span></div></div></section></>}
  </AppShell>;
}
