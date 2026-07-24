import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { AppShell, EmptyState, ErrorState, Freshness, Icon, LoadingPanel, Pagination, StatusPill, outcomeTone, reviewTone, useToast } from '../components';
import { useQuery, useQueryClient } from '../query';
import { Link, useRouter } from '../router';
import type { EventQuery, EventSortField, Outcome, ReviewStatus, SortDirection } from '../types';
import { downloadBlob, eventQueryFromSearchParams, eventQueryToSearchParams, formatDateTime } from '../utils';

interface EventQueryPatch { page?: number; pageSize?: number; cameraId?: string | null; outcome?: Outcome | null; reviewStatus?: ReviewStatus | null; search?: string | null; sortBy?: EventSortField; sortDirection?: SortDirection; from?: string | null; to?: string | null; }
function SortButton({ field, label, currentField, direction, onSort }: { field: EventSortField; label: string; currentField: EventSortField; direction: SortDirection; onSort: (field: EventSortField) => void; }) {
  const active = field === currentField;
  return <button className={active ? 'sort-button sort-button--active' : 'sort-button'} type="button" onClick={() => onSort(field)}>{label} <Icon name="sort" size={16}/><span className="sr-only">{active ? `sorted ${direction}` : 'not sorted'}</span></button>;
}

export default function EventsPage() {
  const { session } = useAuth(); const { searchParams, navigate } = useRouter(); const { pushToast } = useToast(); const queryClient = useQueryClient(); const token = session?.token ?? '';
  const query = useMemo(() => eventQueryFromSearchParams(searchParams), [searchParams]); const [searchInput, setSearchInput] = useState(query.search ?? ''); const [isExporting, setExporting] = useState(false);
  const updateQuery = useCallback((changes: EventQueryPatch, replace = false) => {
    const next: EventQuery = { ...query }; if (changes.page !== undefined) next.page = changes.page; if (changes.pageSize !== undefined) next.pageSize = changes.pageSize; if (changes.sortBy !== undefined) next.sortBy = changes.sortBy; if (changes.sortDirection !== undefined) next.sortDirection = changes.sortDirection;
    const optionalChanges: Array<[keyof Pick<EventQuery, 'cameraId' | 'outcome' | 'reviewStatus' | 'search' | 'from' | 'to'>, string | null | undefined]> = [['cameraId', changes.cameraId], ['outcome', changes.outcome], ['reviewStatus', changes.reviewStatus], ['search', changes.search], ['from', changes.from], ['to', changes.to]];
    for (const [key, value] of optionalChanges) { if (value === null) delete next[key]; else if (value !== undefined) Object.assign(next, { [key]: value }); }
    navigate(`/events?${eventQueryToSearchParams(next).toString()}`, { replace });
  }, [navigate, query]);
  useEffect(() => setSearchInput(query.search ?? ''), [query.search]);
  useEffect(() => { const timeout = window.setTimeout(() => { const normalized = searchInput.trim(); if ((query.search ?? '') === normalized) return; updateQuery({ search: normalized || null, page: 1 }, true); }, 350); return () => window.clearTimeout(timeout); }, [query.search, searchInput, updateQuery]);
  const key = `events:${eventQueryToSearchParams(query).toString()}`;
  const events = useQuery({ key, enabled: Boolean(token), staleTime: 15_000, keepPreviousData: true, queryFn: (signal) => api.getEvents(token, query, signal) });
  useEffect(() => {
    if (!events.data) return; if (events.data.page !== query.page) { updateQuery({ page: events.data.page }, true); return; }
    const adjacentPages = [events.data.hasPreviousPage ? events.data.page - 1 : null, events.data.hasNextPage ? events.data.page + 1 : null].filter((page): page is number => page !== null);
    for (const page of adjacentPages) { const adjacentQuery = { ...query, page }; const adjacentKey = `events:${eventQueryToSearchParams(adjacentQuery).toString()}`; void queryClient.fetchQuery(adjacentKey, (signal) => api.getEvents(token, adjacentQuery, signal), { staleTime: 15_000 }).catch(() => undefined); }
  }, [events.data, query, queryClient, token, updateQuery]);
  function toggleSort(field: EventSortField) { updateQuery({ sortBy: field, sortDirection: query.sortBy === field && query.sortDirection === 'asc' ? 'desc' : 'asc', page: 1 }); }
  function clearFilters() { setSearchInput(''); navigate('/events?page=1&pageSize=20&sortBy=timestamp&sortDirection=desc'); }
  async function exportVisibleQuery() {
    if (isExporting) return; setExporting(true);
    try { const blob = await api.exportEvents(token, { format: 'csv', ...(query.cameraId ? { cameraId: query.cameraId } : {}), ...(query.outcome ? { outcome: query.outcome } : {}), ...(query.reviewStatus ? { reviewStatus: query.reviewStatus } : {}), ...(query.from ? { from: query.from } : {}), ...(query.to ? { to: query.to } : {}) }); downloadBlob(blob, `ptc-bale-events-${new Date().toISOString().slice(0, 10)}.csv`); pushToast('Event export is ready.', 'good'); }
    catch (error) { pushToast(error instanceof Error ? error.message : 'Export failed.', 'bad'); } finally { setExporting(false); }
  }
  const hasFilters = Boolean(query.cameraId || query.outcome || query.reviewStatus || query.search || query.from || query.to);
  return <AppShell title="Events">
    <section className="page-intro"><div><span className="eyebrow">Inspection evidence</span><h2 tabIndex={-1}>Events and violations</h2><p>Search, filter and review persisted inspection outcomes using a server-compatible query model.</p></div><div className="page-intro__actions"><Freshness updatedAt={events.updatedAt} isFetching={events.isFetching} isStale={events.isStale}/><button className="button button--secondary" type="button" onClick={() => void events.refetch()} disabled={events.isFetching}><Icon name="refresh" size={18}/> Refresh</button><button className="button button--primary" type="button" onClick={() => void exportVisibleQuery()} disabled={isExporting}><Icon name="download" size={18}/> {isExporting ? 'Preparing…' : 'Export CSV'}</button></div></section>
    <section className="filter-panel" aria-label="Event filters"><div className="filter-search"><Icon name="search" size={18}/><label className="sr-only" htmlFor="event-search">Search events</label><input id="event-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search event ID, camera, zone or reason"/></div>
      <label>Camera<select value={query.cameraId ?? 'all'} onChange={(event) => updateQuery({ cameraId: event.target.value === 'all' ? null : event.target.value, page: 1 })}><option value="all">All cameras</option><option value="CAM-01">Camera 01</option><option value="CAM-02">Camera 02</option><option value="CAM-03">Camera 03</option><option value="CAM-04">Camera 04</option></select></label>
      <label>Outcome<select value={query.outcome ?? 'all'} onChange={(event) => updateQuery({ outcome: event.target.value === 'all' ? null : event.target.value as Outcome, page: 1 })}><option value="all">All outcomes</option><option value="completed">Completed</option><option value="missed">Missed</option><option value="incomplete">Incomplete</option><option value="unresolved">Unresolved</option></select></label>
      <label>Review<select value={query.reviewStatus ?? 'all'} onChange={(event) => updateQuery({ reviewStatus: event.target.value === 'all' ? null : event.target.value as ReviewStatus, page: 1 })}><option value="all">All review states</option><option value="unreviewed">Unreviewed</option><option value="confirmed">Confirmed</option><option value="dismissed">Dismissed</option></select></label>
      <label>From<input type="date" value={query.from ?? ''} onChange={(event) => updateQuery({ from: event.target.value || null, page: 1 })}/></label><label>To<input type="date" value={query.to ?? ''} onChange={(event) => updateQuery({ to: event.target.value || null, page: 1 })}/></label>{hasFilters && <button className="button button--text" type="button" onClick={clearFilters}>Clear filters</button>}
    </section>
    <section className="panel table-panel">{events.isLoading && <LoadingPanel rows={8} label="Loading event table"/>}{events.error && !events.data && <ErrorState error={events.error} onRetry={() => void events.refetch()}/>} {events.data && events.data.items.length === 0 && <EmptyState title="No matching events" message="Adjust the filters or date range and try again."/>}
      {events.data && events.data.items.length > 0 && <><div className={events.isFetching || events.isPreviousData ? 'table-wrap table-wrap--refreshing' : 'table-wrap'} aria-busy={events.isFetching || events.isPreviousData}><table><caption className="sr-only">Inspection events</caption><thead><tr><th>Event</th><th><SortButton field="timestamp" label="Timestamp" currentField={query.sortBy} direction={query.sortDirection} onSort={toggleSort}/></th><th><SortButton field="cameraName" label="Camera / Zone" currentField={query.sortBy} direction={query.sortDirection} onSort={toggleSort}/></th><th><SortButton field="outcome" label="Outcome" currentField={query.sortBy} direction={query.sortDirection} onSort={toggleSort}/></th><th>Reason</th><th><SortButton field="confidence" label="Confidence" currentField={query.sortBy} direction={query.sortDirection} onSort={toggleSort}/></th><th><SortButton field="reviewStatus" label="Review" currentField={query.sortBy} direction={query.sortDirection} onSort={toggleSort}/></th><th><span className="sr-only">Open</span></th></tr></thead><tbody>{events.data.items.map((event) => <tr key={event.id}><td><strong>{event.id}</strong></td><td>{formatDateTime(event.timestamp)}</td><td><strong>{event.cameraName}</strong><span className="table-subtext">{event.zone}</span></td><td><StatusPill label={event.outcome} tone={outcomeTone(event.outcome)}/></td><td className="reason-cell">{event.reason}</td><td>{event.confidence}%</td><td><StatusPill label={event.reviewStatus} tone={reviewTone(event.reviewStatus)}/></td><td><Link className="table-action" to={`/events/${encodeURIComponent(event.id)}`} aria-label={`Open ${event.id}`}><Icon name="arrow" size={18}/></Link></td></tr>)}</tbody></table></div><Pagination page={events.data.page} totalPages={events.data.totalPages} total={events.data.total} pageSize={events.data.pageSize} onPageChange={(page) => updateQuery({ page })} onPageSizeChange={(pageSize) => updateQuery({ pageSize, page: 1 })} disabled={events.isFetching}/></>}
    </section>
  </AppShell>;
}
