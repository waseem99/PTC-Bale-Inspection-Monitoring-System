import { describe, expect, it } from 'vitest';
import { eventQueryFromSearchParams, eventQueryToSearchParams, safeInteger } from './utils';
describe('event query serialization', () => {
  it('round-trips supported filters and pagination', () => {
    const query = eventQueryFromSearchParams(new URLSearchParams({ page:'3', pageSize:'50', cameraId:'CAM-02', outcome:'missed', reviewStatus:'unreviewed', search:'EVT-2407', sortBy:'confidence', sortDirection:'asc', from:'2026-07-20', to:'2026-07-24' }));
    expect(query).toEqual({ page:3, pageSize:50, cameraId:'CAM-02', outcome:'missed', reviewStatus:'unreviewed', search:'EVT-2407', sortBy:'confidence', sortDirection:'asc', from:'2026-07-20', to:'2026-07-24' });
    expect(eventQueryFromSearchParams(eventQueryToSearchParams(query))).toEqual(query);
  });
  it('clamps invalid page values', () => { expect(safeInteger('-1',1,1,100)).toBe(1); expect(safeInteger('500',1,1,100)).toBe(100); expect(safeInteger('bad',20,10,100)).toBe(20); });
});
