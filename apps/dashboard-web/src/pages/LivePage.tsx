import { api } from '../api';
import { useAuth } from '../auth';
import { AppShell, CameraScene, Freshness, Icon, LoadingPanel, QueryErrorState, StatusPill } from '../components';
import { useQuery } from '../query';
import { formatRelativeTime } from '../utils';

export default function LivePage() {
  const { session } = useAuth(); const token = session?.token ?? '';
  const cameras = useQuery({ key: 'cameras', enabled: Boolean(session), staleTime: 3_000, refetchInterval: 5_000, queryFn: (signal) => api.getCameras(token, signal) });
  return <AppShell title="Live Monitoring">
    <section className="page-intro"><div><span className="eyebrow">Four-camera PoC</span><h2 tabIndex={-1}>Inspection-zone monitoring</h2><p>Camera connectivity and AI processing states remain separate from inspection outcomes.</p></div><div className="page-intro__actions"><Freshness updatedAt={cameras.updatedAt} isFetching={cameras.isFetching} isStale={cameras.isStale}/><button className="button button--secondary" type="button" onClick={() => void cameras.refetch()} disabled={cameras.isFetching}><Icon name="refresh" size={18}/> Refresh</button></div></section>
    <div className="info-banner"><Icon name="camera" size={20}/><span>The current provider uses synthetic visual scenes. The same camera cards accept authorized WebRTC/HLS stream URLs when the edge gateway is connected.</span></div>
    {cameras.isLoading && <LoadingPanel rows={6} label="Loading live monitoring"/>}<QueryErrorState error={cameras.error} hasData={cameras.data !== undefined} onRetry={() => void cameras.refetch()}/>
    {cameras.data && <section className="live-camera-grid" aria-label="Camera monitoring grid">{cameras.data.map((camera) => <article className="live-camera-card" key={camera.id}><CameraScene camera={camera}/><div className="live-camera-card__header"><div><strong>{camera.name}</strong><span>{camera.zone}</span></div><StatusPill label={camera.status} tone={camera.status === 'online' ? 'good' : camera.status === 'warning' ? 'warn' : 'bad'}/></div><dl className="camera-metrics"><div><dt>AI</dt><dd>{camera.aiStatus}</dd></div><div><dt>Last frame</dt><dd>{formatRelativeTime(camera.lastFrameAt)}</dd></div><div><dt>Frame rate</dt><dd>{camera.fps} FPS</dd></div><div><dt>Stream</dt><dd>{camera.streamQuality}</dd></div><div><dt>Events today</dt><dd>{camera.todayEvents}</dd></div></dl></article>)}</section>}
  </AppShell>;
}
