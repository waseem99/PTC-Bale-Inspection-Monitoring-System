import { useMemo, useState } from 'react';
import { cameras, healthMetrics, initialEvents } from './data';
import { ptcLogoDataUri } from './logo';
import type { InspectionEvent, PageKey, ReviewStatus } from './types';
import './styles.css';

const NAV_ITEMS: { key: PageKey; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'grid' },
  { key: 'live', label: 'Live Monitoring', icon: 'camera' },
  { key: 'events', label: 'Events', icon: 'list' },
  { key: 'health', label: 'System Health', icon: 'pulse' },
  { key: 'reports', label: 'Reports', icon: 'report' },
];

function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'square' as const, strokeLinejoin: 'miter' as const };
  const paths: Record<string, JSX.Element> = {
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    camera: <><path d="M4 7h3l1.5-2h7L17 7h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13"/><rect x="3" y="4" width="2" height="2"/><rect x="3" y="10" width="2" height="2"/><rect x="3" y="16" width="2" height="2"/></>,
    pulse: <><path d="M3 12h4l2-5 4 10 2-5h6"/><path d="M4 4h16v16H4z"/></>,
    report: <><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h5M8 12h8M8 16h8"/></>,
    bell: <><path d="M6 9a6 6 0 0 1 12 0v5l2 2H4l2-2z"/><path d="M10 19h4"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    arrow: <path d="M5 12h14M14 7l5 5-5 5"/>,
    download: <><path d="M12 3v12M8 11l4 4 4-4"/><path d="M4 19h16"/></>,
    print: <><path d="M7 8V3h10v5M7 17h10v4H7z"/><path d="M5 9h14a2 2 0 0 1 2 2v5h-4v-3H7v3H3v-5a2 2 0 0 1 2-2z"/></>,
    close: <path d="M5 5l14 14M19 5 5 19"/>,
    check: <path d="M5 12l4 4L19 6"/>,
    warning: <><path d="M12 3 2 21h20z"/><path d="M12 9v5M12 18h.01"/></>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></>,
    logout: <><path d="M10 4H4v16h6M14 8l4 4-4 4M9 12h9"/></>,
  };
  return <svg aria-hidden="true" {...common}>{paths[name] ?? paths.grid}</svg>;
}

function StatusPill({ label, tone }: { label: string; tone: 'good' | 'warn' | 'bad' | 'neutral' | 'info' }) {
  return <span className={`status-pill status-pill--${tone}`}><span className="status-pill__dot" />{label}</span>;
}

function outcomeTone(outcome: InspectionEvent['outcome']) {
  if (outcome === 'completed') return 'good';
  if (outcome === 'missed') return 'bad';
  if (outcome === 'incomplete') return 'warn';
  return 'neutral';
}

function reviewTone(status: ReviewStatus) {
  if (status === 'confirmed') return 'good';
  if (status === 'dismissed') return 'neutral';
  return 'info';
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Karachi',
  }).format(new Date(value));
}

function Login({ onLogin }: { onLogin: (name: string) => void }) {
  const [name, setName] = useState('Supervisor Demo');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function submit(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!name.trim() || !password.trim()) {
      setError('Enter a demo username and password to continue.');
      return;
    }
    onLogin(name.trim());
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand"><img src={ptcLogoDataUri} alt="PTC" /></div>
        <div className="login-copy">
          <span className="eyebrow">Bale Inspection & Monitoring</span>
          <h1>Operational visibility for every inspection.</h1>
          <p>This initial PoC portal demonstrates the planned supervisor workflow using synthetic data and approved design assumptions.</p>
          <div className="login-state-row">
            <StatusPill label="Demo Mode" tone="info" />
            <StatusPill label="No live PTC data" tone="neutral" />
          </div>
        </div>
        <form className="login-form" onSubmit={submit}>
          <div>
            <label htmlFor="username">Username</label>
            <input id="username" value={name} onChange={(event) => setName(event.target.value)} autoComplete="username" />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter any demo password" autoComplete="current-password" />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="button button--primary button--wide" type="submit">Enter dashboard <Icon name="arrow" size={18} /></button>
          <p className="form-note">Authentication is demo-only in this version. Server-side fixed-user access is planned in issue #41.</p>
        </form>
      </section>
      <aside className="login-visual" aria-hidden="true">
        <div className="visual-grid" />
        <div className="visual-ring visual-ring--one" />
        <div className="visual-ring visual-ring--two" />
        <div className="visual-bale visual-bale--one" />
        <div className="visual-bale visual-bale--two" />
        <div className="visual-scan-line" />
        <div className="visual-label">AI MONITORING ACTIVE</div>
      </aside>
    </main>
  );
}

function CameraScene({ cameraId, degraded = false }: { cameraId: string; degraded?: boolean }) {
  return (
    <div className={`camera-scene ${degraded ? 'camera-scene--degraded' : ''}`}>
      <div className="camera-scene__grid" />
      <div className="conveyor" />
      <div className="bale bale--one"><span>BALE</span></div>
      <div className="bale bale--two"><span>BALE</span></div>
      <div className="worker worker--one"><span /></div>
      <div className="worker worker--two"><span /></div>
      <div className="tracking-box tracking-box--bale"><span>Bale 0.94</span></div>
      <div className="tracking-box tracking-box--worker"><span>Worker 0.91</span></div>
      <span className="camera-id-overlay">{cameraId}</span>
      <span className="camera-mode-overlay">DEMO FEED</span>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<PageKey>('overview');
  const [events, setEvents] = useState(initialEvents);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [cameraFilter, setCameraFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [remarksDraft, setRemarksDraft] = useState('');

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const filteredEvents = useMemo(() => events.filter((event) => {
    const matchesCamera = cameraFilter === 'all' || event.cameraId === cameraFilter;
    const matchesOutcome = outcomeFilter === 'all' || event.outcome === outcomeFilter;
    const matchesReview = reviewFilter === 'all' || event.reviewStatus === reviewFilter;
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query || `${event.id} ${event.reason} ${event.cameraName}`.toLowerCase().includes(query);
    return matchesCamera && matchesOutcome && matchesReview && matchesSearch;
  }), [events, cameraFilter, outcomeFilter, reviewFilter, searchTerm]);

  const counts = useMemo(() => ({
    total: 147,
    completed: 132,
    violations: 11,
    unresolved: 4,
    unreviewed: events.filter((event) => event.reviewStatus === 'unreviewed').length,
  }), [events]);

  if (!user) return <Login onLogin={setUser} />;

  function openEvent(event: InspectionEvent) {
    setSelectedEventId(event.id);
    setRemarksDraft(event.remarks ?? '');
  }

  function updateReview(status: ReviewStatus) {
    if (!selectedEvent) return;
    setEvents((current) => current.map((event) => event.id === selectedEvent.id ? { ...event, reviewStatus: status, remarks: remarksDraft } : event));
  }

  function exportCsv() {
    const rows = [
      ['Event ID', 'Timestamp', 'Camera', 'Outcome', 'Reason', 'Confidence', 'Review Status'],
      ...filteredEvents.map((event) => [event.id, event.timestamp, event.cameraName, event.outcome, event.reason, `${event.confidence}%`, event.reviewStatus]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    link.download = 'ptc-bale-inspection-demo.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <img src={ptcLogoDataUri} alt="PTC" />
          <div><strong>Bale Inspection</strong><span>Monitoring System</span></div>
        </div>
        <nav className="sidebar__nav" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => (
            <button key={item.key} className={activePage === item.key ? 'nav-item nav-item--active' : 'nav-item'} onClick={() => setActivePage(item.key)}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar__footer">
          <div className="environment-card">
            <span className="environment-card__label">Environment</span>
            <strong>Development Demo</strong>
            <span>No live PTC operational data</span>
          </div>
          <button className="sidebar-user" onClick={() => setUser(null)}>
            <span className="sidebar-user__avatar"><Icon name="user" size={20} /></span>
            <span><strong>{user}</strong><small>Supervisor</small></span>
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="topbar__context">PTC · Pakistan Standard Time</span>
            <h1>{NAV_ITEMS.find((item) => item.key === activePage)?.label}</h1>
          </div>
          <div className="topbar__actions">
            <StatusPill label="Demo Mode" tone="info" />
            <button className="icon-button" aria-label="Notifications"><Icon name="bell" /></button>
          </div>
        </header>

        <div className="system-strip">
          <div><span className="strip-dot strip-dot--good" /><strong>Local System</strong><span>Online</span></div>
          <div><span className="strip-dot strip-dot--good" /><strong>AI Engine</strong><span>Processing</span></div>
          <div><span className="strip-dot strip-dot--neutral" /><strong>Azure Sync</strong><span>Not configured</span></div>
          <div className="system-strip__time">Last refreshed: just now</div>
        </div>

        <main className="content">
          {activePage === 'overview' && (
            <>
              <section className="page-intro">
                <div><span className="eyebrow">Today · Demo dataset</span><h2>Inspection operations at a glance</h2><p>Monitor inspection outcomes, evidence review and system readiness from one operational view.</p></div>
                <button className="button button--secondary" onClick={() => setActivePage('live')}>Open live monitoring <Icon name="arrow" size={18} /></button>
              </section>

              <section className="kpi-grid">
                <article className="kpi-card kpi-card--primary"><span>Total inspections</span><strong>{counts.total}</strong><small>Across four camera zones</small></article>
                <article className="kpi-card"><span>Completed</span><strong>{counts.completed}</strong><small>89.8% of total inspections</small></article>
                <article className="kpi-card kpi-card--alert"><span>Missed / incomplete</span><strong>{counts.violations}</strong><small>Requires supervisor attention</small></article>
                <article className="kpi-card"><span>Unresolved</span><strong>{counts.unresolved}</strong><small>Visibility or tracking uncertainty</small></article>
                <article className="kpi-card"><span>Unreviewed</span><strong>{counts.unreviewed}</strong><small>Pending human review</small></article>
              </section>

              <section className="split-grid">
                <div className="panel panel--cameras">
                  <div className="panel__header"><div><span className="eyebrow">Camera network</span><h3>Live monitoring status</h3></div><button className="text-button" onClick={() => setActivePage('live')}>View all <Icon name="arrow" size={16} /></button></div>
                  <div className="camera-mini-grid">
                    {cameras.map((camera) => (
                      <article className="camera-mini-card" key={camera.id}>
                        <CameraScene cameraId={camera.id} degraded={camera.status === 'warning'} />
                        <div className="camera-mini-card__meta">
                          <div><strong>{camera.name}</strong><span>{camera.zone}</span></div>
                          <StatusPill label={camera.status === 'online' ? 'Online' : 'Degraded'} tone={camera.status === 'online' ? 'good' : 'warn'} />
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
                <div className="panel">
                  <div className="panel__header"><div><span className="eyebrow">Priority queue</span><h3>Recent events</h3></div><button className="text-button" onClick={() => setActivePage('events')}>All events <Icon name="arrow" size={16} /></button></div>
                  <div className="event-feed">
                    {events.slice(0, 4).map((event) => (
                      <button className="event-feed__item" key={event.id} onClick={() => openEvent(event)}>
                        <span className={`event-icon event-icon--${outcomeTone(event.outcome)}`}><Icon name={event.outcome === 'completed' ? 'check' : 'warning'} size={18} /></span>
                        <span className="event-feed__copy"><strong>{event.reason}</strong><small>{event.cameraName} · {formatDateTime(event.timestamp)}</small></span>
                        <StatusPill label={event.reviewStatus} tone={reviewTone(event.reviewStatus)} />
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </>
          )}

          {activePage === 'live' && (
            <>
              <section className="page-intro"><div><span className="eyebrow">Four approved camera positions</span><h2>Live monitoring</h2><p>Initial visual treatment using synthetic demo scenes. RTSP/WebRTC integration will replace these placeholders.</p></div><StatusPill label="3 online · 1 degraded" tone="warn" /></section>
              <section className="live-grid">
                {cameras.map((camera) => (
                  <article className="live-card" key={camera.id}>
                    <CameraScene cameraId={camera.id} degraded={camera.status === 'warning'} />
                    <div className="live-card__details">
                      <div><span className="eyebrow">{camera.id}</span><h3>{camera.zone}</h3></div>
                      <StatusPill label={camera.status === 'online' ? 'Online' : 'Degraded'} tone={camera.status === 'online' ? 'good' : 'warn'} />
                    </div>
                    <dl className="live-card__stats"><div><dt>AI status</dt><dd>{camera.aiStatus}</dd></div><div><dt>Last frame</dt><dd>{camera.lastFrame}</dd></div><div><dt>Stream</dt><dd>{camera.streamQuality} · {camera.fps} FPS</dd></div><div><dt>Events today</dt><dd>{camera.todayEvents}</dd></div></dl>
                  </article>
                ))}
              </section>
            </>
          )}

          {activePage === 'events' && (
            <>
              <section className="page-intro"><div><span className="eyebrow">Human-review workflow</span><h2>Inspection events</h2><p>Locate missed, incomplete, unresolved and completed inspections with evidence-backed details.</p></div><button className="button button--secondary" onClick={exportCsv}><Icon name="download" size={18} /> Export CSV</button></section>
              <section className="panel panel--flush">
                <div className="filters">
                  <label className="search-field"><Icon name="search" size={18} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search event ID or reason" /></label>
                  <select value={cameraFilter} onChange={(event) => setCameraFilter(event.target.value)}><option value="all">All cameras</option>{cameras.map((camera) => <option key={camera.id} value={camera.id}>{camera.name}</option>)}</select>
                  <select value={outcomeFilter} onChange={(event) => setOutcomeFilter(event.target.value)}><option value="all">All outcomes</option><option value="completed">Completed</option><option value="missed">Missed</option><option value="incomplete">Incomplete</option><option value="unresolved">Unresolved</option></select>
                  <select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value)}><option value="all">All review states</option><option value="unreviewed">Unreviewed</option><option value="confirmed">Confirmed</option><option value="dismissed">Dismissed</option></select>
                  <button className="text-button" onClick={() => { setCameraFilter('all'); setOutcomeFilter('all'); setReviewFilter('all'); setSearchTerm(''); }}>Reset</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Event</th><th>Timestamp</th><th>Camera</th><th>Outcome</th><th>Reason</th><th>Confidence</th><th>Review</th><th /></tr></thead>
                    <tbody>{filteredEvents.map((event) => (
                      <tr key={event.id} onClick={() => openEvent(event)}>
                        <td><strong>{event.id}</strong></td><td>{formatDateTime(event.timestamp)}</td><td>{event.cameraName}</td><td><StatusPill label={event.outcome} tone={outcomeTone(event.outcome)} /></td><td className="reason-cell">{event.reason}</td><td>{event.confidence}%</td><td><StatusPill label={event.reviewStatus} tone={reviewTone(event.reviewStatus)} /></td><td><Icon name="arrow" size={18} /></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <div className="table-footer">Showing {filteredEvents.length} of {events.length} demo events</div>
              </section>
            </>
          )}

          {activePage === 'health' && (
            <>
              <section className="page-intro"><div><span className="eyebrow">Local-first PoC</span><h2>System health</h2><p>Core local processing remains separate from optional Azure synchronization.</p></div><StatusPill label="Operational" tone="good" /></section>
              <section className="health-grid">
                {healthMetrics.map((metric) => (
                  <article className={`health-card health-card--${metric.state}`} key={metric.id}>
                    <div className="health-card__icon"><Icon name={metric.state === 'warning' ? 'warning' : metric.state === 'neutral' ? 'report' : 'pulse'} /></div>
                    <div><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small></div>
                  </article>
                ))}
              </section>
              <section className="panel">
                <div className="panel__header"><div><span className="eyebrow">Camera diagnostics</span><h3>Stream and inference status</h3></div></div>
                <div className="diagnostic-list">{cameras.map((camera) => <div key={camera.id}><div><strong>{camera.name}</strong><span>{camera.zone}</span></div><span>{camera.streamQuality}</span><span>{camera.fps} FPS</span><span>{camera.lastFrame}</span><StatusPill label={camera.aiStatus} tone={camera.aiStatus === 'processing' ? 'good' : 'warn'} /></div>)}</div>
              </section>
            </>
          )}

          {activePage === 'reports' && (
            <>
              <section className="page-intro"><div><span className="eyebrow">Basic PoC reporting</span><h2>Inspection summary</h2><p>On-demand reporting only. Scheduled delivery and Power BI are intentionally outside this initial version.</p></div><div className="button-group"><button className="button button--secondary" onClick={exportCsv}><Icon name="download" size={18} /> CSV</button><button className="button button--primary" onClick={() => window.print()}><Icon name="print" size={18} /> Print / PDF</button></div></section>
              <section className="report-grid">
                <article className="panel report-summary"><span className="eyebrow">Today</span><h3>Inspection compliance</h3><div className="report-score"><strong>89.8%</strong><span>Completed inspections</span></div><div className="bar"><span style={{ width: '89.8%' }} /></div><dl><div><dt>Total inspections</dt><dd>147</dd></div><div><dt>Missed / incomplete</dt><dd>11</dd></div><div><dt>Unresolved</dt><dd>4</dd></div><div><dt>Pending review</dt><dd>{counts.unreviewed}</dd></div></dl></article>
                <article className="panel"><span className="eyebrow">Camera comparison</span><h3>Events captured by zone</h3><div className="chart-list">{cameras.map((camera) => <div key={camera.id}><span>{camera.name}<small>{camera.zone}</small></span><div className="bar"><span style={{ width: `${Math.min(camera.todayEvents * 2, 100)}%` }} /></div><strong>{camera.todayEvents}</strong></div>)}</div></article>
              </section>
            </>
          )}
        </main>
      </div>

      {selectedEvent && (
        <div className="drawer-backdrop" onMouseDown={() => setSelectedEventId(null)}>
          <aside className="event-drawer" onMouseDown={(event) => event.stopPropagation()}>
            <div className="event-drawer__header"><div><span className="eyebrow">{selectedEvent.id}</span><h2>Inspection event detail</h2></div><button className="icon-button" onClick={() => setSelectedEventId(null)} aria-label="Close event detail"><Icon name="close" /></button></div>
            <div className="drawer-status-row"><StatusPill label={selectedEvent.outcome} tone={outcomeTone(selectedEvent.outcome)} /><StatusPill label={selectedEvent.reviewStatus} tone={reviewTone(selectedEvent.reviewStatus)} /></div>
            <div className="evidence-preview">{selectedEvent.evidenceAvailable ? <CameraScene cameraId={selectedEvent.cameraId} degraded={selectedEvent.outcome === 'unresolved'} /> : <div className="evidence-empty"><Icon name="warning" /><strong>Evidence unavailable</strong><span>This demo event does not include a clip.</span></div>}</div>
            <div className="event-summary"><h3>{selectedEvent.reason}</h3><p>{selectedEvent.summary}</p><dl><div><dt>Timestamp</dt><dd>{formatDateTime(selectedEvent.timestamp)}</dd></div><div><dt>Camera</dt><dd>{selectedEvent.cameraName}</dd></div><div><dt>Confidence</dt><dd>{selectedEvent.confidence}%</dd></div><div><dt>Versions</dt><dd>{selectedEvent.modelVersion} · {selectedEvent.ruleVersion}</dd></div></dl></div>
            <div className="step-list"><h3>Observed sequence</h3>{selectedEvent.steps.map((step) => <div key={step.label} className={`step step--${step.state}`}><span><Icon name={step.state === 'complete' ? 'check' : step.state === 'failed' ? 'close' : 'warning'} size={16} /></span><div><strong>{step.label}</strong><small>{step.time ?? (step.state === 'unknown' ? 'Could not be confirmed' : 'Not observed')}</small></div></div>)}</div>
            <div className="review-box"><h3>Supervisor review</h3><label htmlFor="remarks">Remarks</label><textarea id="remarks" value={remarksDraft} onChange={(event) => setRemarksDraft(event.target.value)} placeholder="Add a concise review note" /><div className="review-actions"><button className="button button--secondary" onClick={() => updateReview('dismissed')}>Dismiss</button><button className="button button--primary" onClick={() => updateReview('confirmed')}><Icon name="check" size={18} /> Confirm event</button></div></div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default App;
