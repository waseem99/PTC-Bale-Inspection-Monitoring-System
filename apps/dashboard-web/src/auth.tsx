import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError, runtime } from './api';
import { useQueryClient } from './query';
import type { Role, Session, User } from './types';

const SESSION_KEY = 'ptc-bale:session:v1';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isInitializing: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): Session | null {
  if (runtime.dataMode !== 'mock') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    const user = parsed.user;
    if (
      typeof parsed.token !== 'string' ||
      typeof parsed.expiresAt !== 'string' ||
      !user ||
      typeof user.id !== 'string' ||
      typeof user.username !== 'string' ||
      typeof user.displayName !== 'string' ||
      !['viewer', 'supervisor', 'admin'].includes(user.role)
    ) {
      window.sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      window.sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed as Session;
  } catch {
    window.sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function persistSession(session: Session | null): void {
  if (runtime.dataMode !== 'mock') return;
  if (!session) {
    window.sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(() => readStoredSession());
  const [isInitializing, setInitializing] = useState(true);
  const validationAbort = useRef<AbortController | null>(null);

  const clearSession = useCallback(() => {
    queryClient.clear();
    setSession(null);
    persistSession(null);
  }, [queryClient]);

  useEffect(() => {
    const stored = readStoredSession();
    if (runtime.dataMode === 'mock' && !stored) {
      setInitializing(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    validationAbort.current = controller;
    void api
      .getCurrentSession(stored?.token ?? '', controller.signal)
      .then((validated) => {
        if (!active) return;
        setSession(validated);
        persistSession(validated);
      })
      .catch((error: unknown) => {
        if (!active || (error instanceof ApiError && error.code === 'REQUEST_ABORTED')) return;
        clearSession();
      })
      .finally(() => {
        if (active) setInitializing(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [clearSession]);

  useEffect(() => {
    if (!session) return;
    const remaining = new Date(session.expiresAt).getTime() - Date.now();
    if (remaining <= 0) {
      clearSession();
      return;
    }
    const timeout = window.setTimeout(clearSession, remaining);
    return () => window.clearTimeout(timeout);
  }, [clearSession, session]);

  useEffect(() => {
    if (runtime.dataMode !== 'mock') return;
    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea === window.sessionStorage && event.key === SESSION_KEY) {
        queryClient.clear();
        setSession(readStoredSession());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [queryClient]);

  const login = useCallback(async (username: string, password: string) => {
    validationAbort.current?.abort();
    const controller = new AbortController();
    validationAbort.current = controller;
    const nextSession = await api.login(username, password, controller.signal);
    queryClient.clear();
    setSession(nextSession);
    persistSession(nextSession);
  }, [queryClient]);

  const logout = useCallback(async () => {
    validationAbort.current?.abort();
    const token = session?.token ?? '';
    const hadSession = Boolean(session);
    clearSession();
    if (!hadSession) return;
    const controller = new AbortController();
    validationAbort.current = controller;
    try {
      await api.logout(token, controller.signal);
    } catch {
      // Local sign-out remains authoritative even if server revocation is unavailable.
    }
  }, [clearSession, session]);

  const can = useCallback(
    (...roles: Role[]) => Boolean(session?.user && roles.includes(session.user.role)),
    [session],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isInitializing,
      isAuthenticated: Boolean(session),
      login,
      logout,
      can,
    }),
    [can, isInitializing, login, logout, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider.');
  return value;
}

export function getDemoCredentials(): { username: string; password: string } | null {
  if (runtime.dataMode !== 'mock') return null;
  const allow = import.meta.env.DEV || import.meta.env.VITE_ALLOW_DEMO_CREDENTIALS === 'true';
  if (!allow) return null;
  return {
    username: 'supervisor',
    password: import.meta.env.VITE_DEMO_PASSWORD ?? 'PTC-Demo-2026!',
  };
}
