import { describe, expect, it } from 'vitest';
import { matchRoute } from './router';
describe('route matching', () => {
  it('matches supported routes', () => { expect(matchRoute('/overview').name).toBe('overview'); expect(matchRoute('/live').name).toBe('live'); expect(matchRoute('/events').name).toBe('events'); expect(matchRoute('/health').name).toBe('health'); expect(matchRoute('/reports').name).toBe('reports'); });
  it('decodes event identifiers', () => { expect(matchRoute('/events/EVT-2407-0123')).toEqual({name:'eventDetail',params:{eventId:'EVT-2407-0123'}}); });
  it('returns not found', () => { expect(matchRoute('/unsupported').name).toBe('notFound'); });
});
