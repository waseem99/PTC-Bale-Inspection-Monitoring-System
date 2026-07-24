import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError, __testables, api, generateMockEvents } from './api';

describe('mock API provider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('generates deterministic, versioned events', () => {
    const events = generateMockEvents(25);
    expect(events).toHaveLength(25);
    expect(events[0]?.id).toBe('EVT-2407-0025');
    expect(events.every((event) => event.version >= 1)).toBe(true);
  });

  it('applies server-compatible pagination, filtering and sorting', () => {
    const result = __testables.applyEventQuery(generateMockEvents(120), {
      page: 2,
      pageSize: 10,
      outcome: 'completed',
      sortBy: 'confidence',
      sortDirection: 'desc',
    });
    expect(result.page).toBe(2);
    expect(result.items.length).toBeLessThanOrEqual(10);
    expect(result.items.every((event) => event.outcome === 'completed')).toBe(true);
    for (let index = 1; index < result.items.length; index += 1) {
      expect(result.items[index - 1]!.confidence).toBeGreaterThanOrEqual(result.items[index]!.confidence);
    }
  });

  it('calculates summary totals', () => {
    const events = generateMockEvents(100);
    const summary = __testables.calculateSummary(events);
    expect(summary.total).toBe(100);
    expect(summary.completed + summary.violations + summary.unresolved).toBe(100);
  });

  it('authenticates a fixed supervisor and persists a versioned review', async () => {
    const session = await api.login('supervisor', 'PTC-Demo-2026!');
    const page = await api.getEvents(session.token, {
      page: 1,
      pageSize: 20,
      reviewStatus: 'unreviewed',
      sortBy: 'timestamp',
      sortDirection: 'desc',
    });
    const event = page.items[0];
    expect(event).toBeDefined();

    const updated = await api.reviewEvent(session.token, event!.id, {
      reviewStatus: 'confirmed',
      remarks: 'Confirmed during provider test.',
      expectedVersion: event!.version,
    });

    expect(updated.reviewStatus).toBe('confirmed');
    expect(updated.remarks).toBe('Confirmed during provider test.');
    expect(updated.version).toBe(event!.version + 1);
    await expect(api.getEvent(session.token, event!.id)).resolves.toMatchObject({
      reviewStatus: 'confirmed',
      remarks: 'Confirmed during provider test.',
    });
  });

  it('prevents a viewer from submitting a review', async () => {
    const session = await api.login('viewer', 'PTC-Demo-2026!');
    const event = generateMockEvents(1)[0]!;

    await expect(
      api.reviewEvent(session.token, event.id, {
        reviewStatus: 'dismissed',
        remarks: 'Not permitted.',
        expectedVersion: event.version,
      }),
    ).rejects.toMatchObject<Partial<ApiError>>({ code: 'FORBIDDEN', status: 403 });
  });
});
