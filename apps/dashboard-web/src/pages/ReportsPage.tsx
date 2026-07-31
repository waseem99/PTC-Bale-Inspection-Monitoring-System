import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { AppShell, Icon, useToast } from '../components';
import type { Outcome, ReviewStatus } from '../types';
import { downloadBlob } from '../utils';

export default function ReportsPage() {
  const { session } = useAuth(); const { pushToast } = useToast(); const token = session?.token ?? ''; const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today); const [to, setTo] = useState(today); const [cameraId, setCameraId] = useState('all'); const [outcome, setOutcome] = useState('all'); const [reviewStatus, setReviewStatus] = useState('all'); const [isExporting, setExporting] = useState(false);
  async function generateExport() {
    if (isExporting) return; if (from && to && from > to) { pushToast('The start date cannot be after the end date.', 'bad'); return; } setExporting(true);
    try { const blob = await api.exportEvents(token, { format: 'csv', ...(cameraId !== 'all' ? { cameraId } : {}), ...(outcome !== 'all' ? { outcome: outcome as Outcome } : {}), ...(reviewStatus !== 'all' ? { reviewStatus: reviewStatus as ReviewStatus } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) }); downloadBlob(blob, `ptc-bale-report-${from || 'all'}-${to || 'all'}.csv`); pushToast('Report export is ready.', 'good'); }
    catch (error) { pushToast(error instanceof Error ? error.message : 'Report export failed.', 'bad'); } finally { setExporting(false); }
  }
  return <AppShell title="Reports">
    <section className="page-intro"><div><span className="eyebrow">On-demand reporting</span><h2 tabIndex={-1}>Inspection summary export</h2><p>Generate filtered CSV records for operational review. Scheduled reporting and advanced Power BI analytics remain outside this PoC.</p></div><button className="button button--secondary" type="button" onClick={() => window.print()}><Icon name="print" size={18}/> Print page</button></section>
    <section className="report-layout"><article className="panel report-builder"><div className="panel__header"><div><span className="eyebrow">Report criteria</span><h3>Select the required event range</h3></div></div><div className="report-form-grid">
      <label>From date<input type="date" value={from} onChange={(event) => setFrom(event.target.value)}/></label><label>To date<input type="date" value={to} onChange={(event) => setTo(event.target.value)}/></label>
      <label>Camera<select value={cameraId} onChange={(event) => setCameraId(event.target.value)}><option value="all">All cameras</option><option value="CAM-01">Camera 01</option><option value="CAM-02">Camera 02</option><option value="CAM-03">Camera 03</option><option value="CAM-04">Camera 04</option></select></label>
      <label>Outcome<select value={outcome} onChange={(event) => setOutcome(event.target.value)}><option value="all">All outcomes</option><option value="completed">Completed</option><option value="missed">Missed</option><option value="incomplete">Incomplete</option><option value="unresolved">Unresolved</option></select></label>
      <label>Review status<select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value)}><option value="all">All review states</option><option value="unreviewed">Unreviewed</option><option value="confirmed">Confirmed</option><option value="dismissed">Dismissed</option></select></label>
    </div><button className="button button--primary" type="button" onClick={() => void generateExport()} disabled={isExporting}><Icon name="download" size={18}/> {isExporting ? 'Generating export…' : 'Download CSV report'}</button></article>
    <aside className="panel report-notes"><div className="panel__header"><div><span className="eyebrow">Included fields</span><h3>Export contents</h3></div></div><ul className="check-list"><li><Icon name="check" size={18}/> Event ID and timestamp</li><li><Icon name="check" size={18}/> Camera and inspection zone</li><li><Icon name="check" size={18}/> Automated outcome and reason</li><li><Icon name="check" size={18}/> Confidence and review status</li><li><Icon name="check" size={18}/> Reviewer and remarks where available</li></ul><div className="report-security-note"><Icon name="lock" size={20}/><span>Evidence images and clips are not embedded in CSV exports.</span></div></aside></section>
  </AppShell>;
}
