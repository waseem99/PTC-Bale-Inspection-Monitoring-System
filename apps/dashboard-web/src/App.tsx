import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { useAuth } from './auth';
import { LoadingPanel } from './components';
import { matchRoute, navigate, useRouter } from './router';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const LivePage = lazy(() => import('./pages/LivePage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage'));
const HealthPage = lazy(() => import('./pages/HealthPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function FullPageLoading() {
  return <main className="full-page-loading"><LoadingPanel rows={5} label="Loading dashboard" /></main>;
}

export default function App() {
  const { pathname } = useRouter();
  const { isAuthenticated, isInitializing } = useAuth();
  const route = matchRoute(pathname);

  useEffect(() => {
    if (isInitializing || isAuthenticated || route.name === 'login') return;
    const returnTo = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
    navigate(`/login?returnTo=${returnTo}`, { replace: true });
  }, [isAuthenticated, isInitializing, route.name]);

  if (isInitializing) return <FullPageLoading />;
  if (!isAuthenticated && route.name !== 'login') return <FullPageLoading />;

  let page: ReactNode;
  switch (route.name) {
    case 'login':
      page = <LoginPage />;
      break;
    case 'overview':
      page = <OverviewPage />;
      break;
    case 'live':
      page = <LivePage />;
      break;
    case 'events':
      page = <EventsPage />;
      break;
    case 'eventDetail':
      page = <EventDetailPage eventId={route.params.eventId ?? ''} />;
      break;
    case 'health':
      page = <HealthPage />;
      break;
    case 'reports':
      page = <ReportsPage />;
      break;
    case 'notFound':
      page = <NotFoundPage />;
      break;
  }

  return <Suspense fallback={<FullPageLoading />}>{page}</Suspense>;
}
