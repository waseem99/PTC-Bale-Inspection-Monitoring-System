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

interface CacheEntry<T> {
  data?: T;
  error?: unknown;
  updatedAt: number;
  revision: number;
  isFetching: boolean;
  promise: Promise<T> | undefined;
  controller: AbortController | undefined;
  subscribers: Set<() => void>;
}

interface FetchOptions {
  staleTime?: number;
  force?: boolean;
}

export class QueryClient {
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  private getOrCreate<T>(key: string): CacheEntry<T> {
    const existing = this.cache.get(key) as CacheEntry<T> | undefined;
    if (existing) return existing;
    const created: CacheEntry<T> = {
      updatedAt: 0,
      revision: 0,
      isFetching: false,
      promise: undefined,
      controller: undefined,
      subscribers: new Set(),
    };
    this.cache.set(key, created as CacheEntry<unknown>);
    return created;
  }

  subscribe(key: string, callback: () => void): () => void {
    const entry = this.getOrCreate(key);
    entry.subscribers.add(callback);
    return () => {
      entry.subscribers.delete(callback);
      window.setTimeout(() => {
        if (entry.subscribers.size === 0 && entry.isFetching) entry.controller?.abort('query-unused');
      }, 0);
    };
  }

  private notify(key: string): void {
    const entry = this.cache.get(key);
    entry?.subscribers.forEach((callback) => callback());
  }

  getSnapshot<T>(key: string): CacheEntry<T> {
    return this.getOrCreate<T>(key);
  }

  setQueryData<T>(key: string, updater: T | ((current: T | undefined) => T)): void {
    const entry = this.getOrCreate<T>(key);
    entry.data = typeof updater === 'function' ? (updater as (current: T | undefined) => T)(entry.data) : updater;
    entry.error = undefined;
    entry.updatedAt = Date.now();
    this.notify(key);
  }

  async fetchQuery<T>(key: string, queryFn: (signal: AbortSignal) => Promise<T>, options: FetchOptions = {}): Promise<T> {
    const entry = this.getOrCreate<T>(key);
    const staleTime = options.staleTime ?? 0;
    const isFresh = entry.data !== undefined && Date.now() - entry.updatedAt <= staleTime;
    if (!options.force && isFresh) return entry.data as T;
    if (entry.promise) return entry.promise;

    const controller = new AbortController();
    entry.controller = controller;
    entry.isFetching = true;
    entry.error = undefined;
    this.notify(key);

    const promise = queryFn(controller.signal)
      .then((data) => {
        entry.data = data;
        entry.error = undefined;
        entry.updatedAt = Date.now();
        return data;
      })
      .catch((error: unknown) => {
        entry.error = error;
        throw error;
      })
      .finally(() => {
        entry.isFetching = false;
        entry.promise = undefined;
        entry.controller = undefined;
        this.notify(key);
      });

    entry.promise = promise;
    return promise;
  }

  invalidateQueries(prefix: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(prefix)) {
        entry.updatedAt = 0;
        entry.revision += 1;
        this.notify(key);
      }
    }
  }

  removeQueries(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.get(key)?.controller?.abort('query-removed');
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    for (const entry of this.cache.values()) entry.controller?.abort('query-client-cleared');
    this.cache.clear();
  }
}

const QueryClientContext = createContext<QueryClient | null>(null);

export function QueryClientProvider({ client, children }: { client: QueryClient; children: ReactNode }) {
  return <QueryClientContext.Provider value={client}>{children}</QueryClientContext.Provider>;
}

export function useQueryClient(): QueryClient {
  const client = useContext(QueryClientContext);
  if (!client) throw new Error('useQueryClient must be used within QueryClientProvider.');
  return client;
}

interface UseQueryOptions<T> {
  key: string;
  queryFn: (signal: AbortSignal) => Promise<T>;
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
  keepPreviousData?: boolean;
}

interface QueryResult<T> {
  data?: T;
  error?: unknown;
  isLoading: boolean;
  isFetching: boolean;
  isStale: boolean;
  isPreviousData: boolean;
  updatedAt: number;
  refetch: () => Promise<void>;
}

export function useQuery<T>({
  key,
  queryFn,
  enabled = true,
  staleTime = 0,
  refetchInterval,
  keepPreviousData = false,
}: UseQueryOptions<T>): QueryResult<T> {
  const client = useQueryClient();
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;
  const [, forceRender] = useState(0);
  const previousDataRef = useRef<T | undefined>(undefined);
  const snapshot = client.getSnapshot<T>(key);

  useEffect(() => client.subscribe(key, () => forceRender((value) => value + 1)), [client, key]);

  useEffect(() => {
    if (!enabled) return;
    void client.fetchQuery<T>(key, (signal) => queryFnRef.current(signal), { staleTime }).catch(() => undefined);
  }, [client, enabled, key, staleTime, snapshot.revision]);

  useEffect(() => {
    if (!enabled || !refetchInterval) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void client.fetchQuery<T>(key, (signal) => queryFnRef.current(signal), { force: true }).catch(() => undefined);
      }
    }, refetchInterval);
    return () => window.clearInterval(interval);
  }, [client, enabled, key, refetchInterval]);

  if (snapshot.data !== undefined) previousDataRef.current = snapshot.data;
  const visibleData = snapshot.data ?? (keepPreviousData ? previousDataRef.current : undefined);
  const isPreviousData = snapshot.data === undefined && visibleData !== undefined;
  const refetch = useCallback(async () => {
    await client.fetchQuery<T>(key, (signal) => queryFnRef.current(signal), { force: true });
  }, [client, key]);

  return {
    ...(visibleData !== undefined ? { data: visibleData } : {}),
    ...(snapshot.error !== undefined ? { error: snapshot.error } : {}),
    isLoading: enabled && visibleData === undefined && (snapshot.isFetching || (snapshot.updatedAt === 0 && snapshot.error === undefined)),
    isFetching: snapshot.isFetching,
    isStale: visibleData !== undefined && (isPreviousData || Date.now() - snapshot.updatedAt > staleTime),
    isPreviousData,
    updatedAt: isPreviousData ? 0 : snapshot.updatedAt,
    refetch,
  };
}

interface MutationResult<TInput, TOutput> {
  mutate: (input: TInput) => Promise<TOutput>;
  isPending: boolean;
  error?: unknown;
  reset: () => void;
}

export function useMutation<TInput, TOutput>(
  mutationFn: (input: TInput, signal: AbortSignal) => Promise<TOutput>,
): MutationResult<TInput, TOutput> {
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(undefined);
  const controllerRef = useRef<AbortController | null>(null);
  const pendingRef = useRef(false);
  const mutationFnRef = useRef(mutationFn);
  mutationFnRef.current = mutationFn;

  useEffect(() => () => controllerRef.current?.abort(), []);

  const mutate = useCallback(async (input: TInput) => {
    if (pendingRef.current) throw new Error('A mutation is already in progress.');
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    pendingRef.current = true;
    setPending(true);
    setError(undefined);
    try {
      return await mutationFnRef.current(input, controller.signal);
    } catch (mutationError) {
      setError(mutationError);
      throw mutationError;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, []);

  const reset = useCallback(() => setError(undefined), []);
  return useMemo(
    () => ({ mutate, isPending, ...(error !== undefined ? { error } : {}), reset }),
    [error, isPending, mutate, reset],
  );
}
