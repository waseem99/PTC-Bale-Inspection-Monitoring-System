import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';

interface NavigateOptions {
  replace?: boolean;
  bypassBlocker?: boolean;
}

interface RouterValue {
  pathname: string;
  searchParams: URLSearchParams;
  navigate: (to: string, options?: NavigateOptions) => void;
}

type NavigationBlocker = () => string | null;
let activeNavigationBlocker: NavigationBlocker | null = null;

const RouterContext = createContext<RouterValue | null>(null);

function getLocationSnapshot() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function subscribeToLocation(callback: () => void) {
  window.addEventListener('popstate', callback);
  window.addEventListener('ptc:navigate', callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener('ptc:navigate', callback);
  };
}

export function setNavigationBlocker(blocker: NavigationBlocker | null): () => void {
  activeNavigationBlocker = blocker;
  return () => {
    if (activeNavigationBlocker === blocker) activeNavigationBlocker = null;
  };
}

export function navigate(to: string, options: NavigateOptions = {}): void {
  const current = `${window.location.pathname}${window.location.search}`;
  if (to === current && !options.replace) return;
  if (!options.bypassBlocker) {
    const message = activeNavigationBlocker?.();
    if (message && !window.confirm(message)) return;
  }
  if (options.replace) window.history.replaceState(null, '', to);
  else window.history.pushState(null, '', to);
  window.dispatchEvent(new Event('ptc:navigate'));
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribeToLocation, getLocationSnapshot, () => '/');
  const url = useMemo(() => new URL(snapshot, window.location.origin), [snapshot]);
  const value = useMemo<RouterValue>(
    () => ({
      pathname: url.pathname,
      searchParams: url.searchParams,
      navigate,
    }),
    [url],
  );

  useEffect(() => {
    const heading = document.querySelector<HTMLElement>('main h1, main h2');
    heading?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [url.pathname]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const value = useContext(RouterContext);
  if (!value) throw new Error('useRouter must be used within RouterProvider.');
  return value;
}

export function Link({
  to,
  children,
  className,
  ariaCurrent,
}: {
  to: string;
  children: ReactNode;
  className?: string;
  ariaCurrent?: 'page' | undefined;
}) {
  return (
    <a
      href={to}
      className={className}
      aria-current={ariaCurrent}
      onClick={(event) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

export interface RouteMatch {
  name: 'login' | 'overview' | 'live' | 'events' | 'eventDetail' | 'health' | 'reports' | 'notFound';
  params: Record<string, string>;
}

export function matchRoute(pathname: string): RouteMatch {
  if (pathname === '/' || pathname === '') return { name: 'overview', params: {} };
  if (pathname === '/login') return { name: 'login', params: {} };
  if (pathname === '/overview') return { name: 'overview', params: {} };
  if (pathname === '/live') return { name: 'live', params: {} };
  if (pathname === '/events') return { name: 'events', params: {} };
  if (pathname === '/health') return { name: 'health', params: {} };
  if (pathname === '/reports') return { name: 'reports', params: {} };
  const eventMatch = /^\/events\/([^/]+)$/.exec(pathname);
  if (eventMatch?.[1]) return { name: 'eventDetail', params: { eventId: decodeURIComponent(eventMatch[1]) } };
  return { name: 'notFound', params: {} };
}
