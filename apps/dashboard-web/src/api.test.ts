import { describe, expect, it } from 'vitest';
import { __testables, generateMockEvents } from './api';
describe('mock API dataset', () => {
  it('generates deterministic, versioned events', () => { const events=generateMockEvents(25); expect(events).toHaveLength(25); expect(events[0]?.id).toBe('EVT-2407-0025'); expect(events.every((event)=>event.version>=1)).toBe(true); });
  it('applies server-compatible pagination, filtering and sorting', () => { const result=__testables.applyEventQuery(generateMockEvents(120),{page:2,pageSize:10,outcome:'completed',sortBy:'confidence',sortDirection:'desc'}); expect(result.page).toBe(2); expect(result.items.length).toBeLessThanOrEqual(10); expect(result.items.every((event)=>event.outcome==='completed')).toBe(true); for(let index=1;index<result.items.length;index+=1) expect(result.items[index-1]!.confidence).toBeGreaterThanOrEqual(result.items[index]!.confidence); });
  it('calculates summary totals', () => { const events=generateMockEvents(100); const summary=__testables.calculateSummary(events); expect(summary.total).toBe(100); expect(summary.completed+summary.violations+summary.unresolved).toBe(100); });
});
