import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchFdaDrugs } from '../src/fdaClient';

type FetchMock = ReturnType<typeof vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>>;

describe('fetchFdaDrugs', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('construit la requête et parse les résultats en cas de succès', async () => {
    const fetchMock = global.fetch as unknown as FetchMock;

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: [{ application_number: 'APP-001' }],
        meta: { results: { total: 1 } },
      }),
    } as Response);

    const data = await fetchFdaDrugs({ search: 'TEST', page: 2, pageSize: 5 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0][0].toString();
    expect(calledUrl).toContain('skip=5');
    expect(calledUrl).toContain('limit=5');
    expect(calledUrl).toContain('search=');

    expect(data.results).toHaveLength(1);
    expect(data.meta?.results?.total).toBe(1);
  });

  it('retourne une liste vide quand la FDA renvoie 404', async () => {
    const fetchMock = global.fetch as unknown as FetchMock;

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response);

    const data = await fetchFdaDrugs({ search: 'INEXISTANT' });

    expect(data.results).toEqual([]);
    expect(data.meta?.results?.total).toBe(0);
  });

  it('jette une erreur pour les autres statuts HTTP', async () => {
    const fetchMock = global.fetch as unknown as FetchMock;

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    await expect(fetchFdaDrugs({})).rejects.toThrow('FDA API error: 500');
  });
});
