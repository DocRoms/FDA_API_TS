import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchFdaDrugs } from './fdaClient';

describe('fetchFdaDrugs', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn() as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('construit la requête et parse les résultats en cas de succès', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: [{ application_number: 'APP-001' }],
        meta: { results: { total: 1 } },
      }),
    });

    const data = await fetchFdaDrugs({ search: 'TEST', page: 2, pageSize: 5 });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calledUrl = (global.fetch as any).mock.calls[0][0].toString();
    expect(calledUrl).toContain('skip=5');
    expect(calledUrl).toContain('limit=5');
    expect(calledUrl).toContain('search=');

    expect(data.results).toHaveLength(1);
    expect(data.meta?.results?.total).toBe(1);
  });

  it('retourne une liste vide quand la FDA renvoie 404', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    const data = await fetchFdaDrugs({ search: 'INEXISTANT' });

    expect(data.results).toEqual([]);
    expect(data.meta?.results?.total).toBe(0);
  });

  it('jette une erreur pour les autres statuts HTTP', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(fetchFdaDrugs({})).rejects.toThrow('FDA API error: 500');
  });
});

