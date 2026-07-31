import { afterEach, describe, expect, it, vi } from 'vitest';
import { matchRoute, navigate, setNavigationBlocker } from './router';

describe('route matching', () => {
  afterEach(() => {
    setNavigationBlocker(null);
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
  });

  it('matches supported routes', () => {
    expect(matchRoute('/overview').name).toBe('overview');
    expect(matchRoute('/live').name).toBe('live');
    expect(matchRoute('/events').name).toBe('events');
    expect(matchRoute('/health').name).toBe('health');
    expect(matchRoute('/reports').name).toBe('reports');
  });

  it('decodes event identifiers', () => {
    expect(matchRoute('/events/EVT-2407-0123')).toEqual({
      name: 'eventDetail',
      params: { eventId: 'EVT-2407-0123' },
    });
  });

  it('returns not found for unsupported routes', () => {
    expect(matchRoute('/unsupported').name).toBe('notFound');
  });

  it('prevents internal navigation when unsaved changes are rejected', () => {
    window.history.replaceState(null, '', '/events/EVT-2407-0123');
    setNavigationBlocker(() => 'Unsaved changes');
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    navigate('/events');

    expect(window.location.pathname).toBe('/events/EVT-2407-0123');
  });

  it('allows internal navigation after confirmation', () => {
    window.history.replaceState(null, '', '/events/EVT-2407-0123');
    setNavigationBlocker(() => 'Unsaved changes');
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    navigate('/events');

    expect(window.location.pathname).toBe('/events');
  });
});
