import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from './query';

describe('QueryClient', () => {
  it('deduplicates simultaneous requests for the same key', async () => {
    const client = new QueryClient();
    const query = vi.fn(async () => 'result');

    const first = client.fetchQuery('summary', query);
    const second = client.fetchQuery('summary', query);

    await expect(first).resolves.toBe('result');
    await expect(second).resolves.toBe('result');
    expect(query).toHaveBeenCalledOnce();
  });

  it('reuses fresh cache data without another request', async () => {
    const client = new QueryClient();
    const query = vi.fn(async () => ({ total: 10 }));

    await client.fetchQuery('summary', query, { staleTime: 60_000 });
    await client.fetchQuery('summary', query, { staleTime: 60_000 });

    expect(query).toHaveBeenCalledOnce();
    expect(client.getSnapshot<{ total: number }>('summary').data).toEqual({ total: 10 });
  });

  it('marks matching queries stale when invalidated', async () => {
    const client = new QueryClient();
    await client.fetchQuery('events:page=1', async () => ['event']);
    const before = client.getSnapshot<string[]>('events:page=1').revision;

    client.invalidateQueries('events:');

    const after = client.getSnapshot<string[]>('events:page=1');
    expect(after.updatedAt).toBe(0);
    expect(after.revision).toBe(before + 1);
  });
});
