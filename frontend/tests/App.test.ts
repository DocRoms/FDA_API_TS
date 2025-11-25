import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import App from '../src/App.vue';

const nextTickAll = async () => {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

type FetchMock = ReturnType<typeof vi.fn<Parameters<typeof fetch>, Promise<Response>>>;

declare global {
  // Vitest fournit `fetch` globalement dans l’environnement jsdom
  // On l’étend pour pouvoir le caster en FetchMock dans les tests.
   
  var fetch: typeof fetch;
}

describe('App.vue', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.startsWith('/api/drugs')) {
        const response: Response = {
          ok: true,
          status: 200,
          json: async () => ({
            page: 1,
            pageSize: 10,
            total: 25,
            items: [
              {
                id: 'APP-001',
                applicationNumber: 'APP-001',
                sponsorName: 'B-LAB',
                productName: 'B-DRUG',
                substanceName: 'SUB-B',
                route: 'ORAL',
              },
              {
                id: 'APP-002',
                applicationNumber: 'APP-002',
                sponsorName: 'A-LAB',
                productName: 'A-DRUG',
                substanceName: 'SUB-A',
                route: 'INTRAVENOUS',
              },
            ],
          }),
        } as unknown as Response;

        return Promise.resolve(response);
      }
      if (url.startsWith('/api/ping')) {
        const response: Response = {
          ok: true,
          status: 200,
          json: async () => ({ message: 'pong' }),
        } as unknown as Response;
        return Promise.resolve(response);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders main title', () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain('FDA Drug Browser');
  });

  it('charge et affiche les médicaments triés par nom de marque (asc par défaut)', async () => {
    const wrapper = mount(App);

    await nextTickAll();

    const rows = wrapper.findAll('tbody tr');
    const firstRowText = rows[0].text();
    const secondRowText = rows[1].text();

    expect(firstRowText).toContain('A-DRUG');
    expect(secondRowText).toContain('B-DRUG');
  });

  it('inverse l’ordre de tri quand on reclique sur la même colonne', async () => {
    const wrapper = mount(App);

    await nextTickAll();

    let rows = wrapper.findAll('tbody tr');
    expect(rows[0].text()).toContain('A-DRUG');

    const nameHeader = wrapper.find('th');
    await nameHeader.trigger('click');
    await nextTickAll();

    rows = wrapper.findAll('tbody tr');
    expect(rows[0].text()).toContain('B-DRUG');
  });

  it('affiche "Aucun résultat" quand aucun médicament n’est retourné', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.startsWith('/api/drugs')) {
        const response: Response = {
          ok: true,
          status: 200,
          json: async () => ({ page: 1, pageSize: 10, total: 0, items: [] }),
        } as unknown as Response;
        return Promise.resolve(response);
      }
      const response: Response = {
        ok: true,
        status: 200,
        json: async () => ({ message: 'pong' }),
      } as unknown as Response;
      return Promise.resolve(response);
    }) as unknown as typeof fetch;

    const wrapper = mount(App);
    await nextTickAll();

    expect(wrapper.text()).toContain('Aucun résultat pour ces critères');
  });

  it('gère une erreur lors du chargement des médicaments', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.startsWith('/api/drugs')) {
        const response: Response = {
          ok: false,
          status: 500,
          json: async () => ({}),
        } as unknown as Response;
        return Promise.resolve(response);
      }
      const response: Response = {
        ok: true,
        status: 200,
        json: async () => ({ message: 'pong' }),
      } as unknown as Response;
      return Promise.resolve(response);
    }) as unknown as typeof fetch;

    const wrapper = mount(App);
    await nextTickAll();

    expect(wrapper.text()).toMatch(/HTTP 500/);
  });

  it('appelle /ping et affiche la réponse', async () => {
    const wrapper = mount(App);

    await nextTickAll();

    const pingButtons = wrapper.findAll('button');
    const pingButton = pingButtons.find((b) => b.text().includes('/ping'));
    expect(pingButton).toBeTruthy();
    await pingButton!.trigger('click');

    await nextTickAll();

    expect(wrapper.text()).toContain('pong');
  });

  it('met à jour la recherche et réinitialise la page', async () => {
    const wrapper = mount(App);

    await nextTickAll();

    const input = wrapper.find('input[type="text"]');
    await input.setValue('TEST QUERY');
    await wrapper.find('form').trigger('submit.prevent');

    const fetchMock = global.fetch as unknown as FetchMock;
    expect(fetchMock).toHaveBeenCalled();

    const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    const parsedUrl = new URL(lastCall[0].toString(), 'http://localhost');
    expect(parsedUrl.searchParams.get('search')).toBe('TEST QUERY');
    expect(parsedUrl.searchParams.get('page')).toBe('1');
  });

  it('déclenche le changement de page via le bouton Suivant', async () => {
    const wrapper = mount(App);

    await nextTickAll();

    const fetchMock = global.fetch as unknown as FetchMock;
    fetchMock.mockClear();

    const nextButton = wrapper.findAll('button').find((b) => b.text().includes('Suivant'));
    expect(nextButton).toBeTruthy();

    await nextButton!.trigger('click');
    await nextTickAll();

    expect(fetchMock).toHaveBeenCalled();
    const call = fetchMock.mock.calls[0];
    const parsedUrl = new URL(call[0].toString(), 'http://localhost');
    expect(parsedUrl.searchParams.get('page')).toBe('2');
  });

  it('affiche une erreur si /ping renvoie une erreur HTTP', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.startsWith('/api/drugs')) {
        const response: Response = {
          ok: true,
          status: 200,
          json: async () => ({
            page: 1,
            pageSize: 10,
            total: 0,
            items: [],
          }),
        } as unknown as Response;
        return Promise.resolve(response);
      }
      if (url.startsWith('/api/ping')) {
        const response: Response = {
          ok: false,
          status: 503,
          json: async () => ({}),
        } as unknown as Response;
        return Promise.resolve(response);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    }) as unknown as typeof fetch;

    const wrapper = mount(App);
    await nextTickAll();

    const pingButtons = wrapper.findAll('button');
    const pingButton = pingButtons.find((b) => b.text().includes('/ping'));
    expect(pingButton).toBeTruthy();
    await pingButton!.trigger('click');
    await nextTickAll();

    expect(wrapper.text()).toMatch(/HTTP 503/);
  });
});

describe('App.vue - UI states', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('affiche l’état de chargement pendant le fetch initial', async () => {
    global.fetch = vi.fn(() =>
      new Promise<Response>((resolve) => {
        const response: Response = {
          ok: true,
          status: 200,
          json: async () => ({ page: 1, pageSize: 10, total: 0, items: [] }),
        } as unknown as Response;

        setTimeout(() => resolve(response), 20);
      }),
    ) as unknown as typeof fetch;

    const wrapper = mount(App);

    // Laisser Vue passer un tick pour rendre l'état loading avant que la requête ne se termine
    await Promise.resolve();

    expect(wrapper.text()).toContain('Chargement des médicaments...');

    await nextTickAll();
  });

  it('affiche et désactive le bouton Précédent sur la première page', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.startsWith('/api/drugs')) {
        const response: Response = {
          ok: true,
          status: 200,
          json: async () => ({
            page: 1,
            pageSize: 10,
            total: 100,
            items: [],
          }),
        } as unknown as Response;
        return Promise.resolve(response);
      }
      const response: Response = {
        ok: true,
        status: 200,
        json: async () => ({ message: 'pong' }),
      } as unknown as Response;
      return Promise.resolve(response);
    }) as unknown as typeof fetch;

    const wrapper = mount(App);
    await nextTickAll();

    const prevButton = wrapper.findAll('button').find((b) => b.text().includes('Précédent'));
    expect(prevButton).toBeTruthy();
    expect((prevButton!.element as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('App.vue - erreurs et pagination limites', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('affiche un message d’erreur utilisateur lorsque drugsError est défini', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.startsWith('/api/drugs')) {
        const response: Response = {
          ok: false,
          status: 404,
          json: async () => ({}),
        } as unknown as Response;
        return Promise.resolve(response);
      }
      const response: Response = {
        ok: true,
        status: 200,
        json: async () => ({ message: 'pong' }),
      } as unknown as Response;
      return Promise.resolve(response);
    }) as unknown as typeof fetch;

    const wrapper = mount(App);
    await nextTickAll();

    expect(wrapper.text()).toMatch(/HTTP 404/);
  });

  it('désactive le bouton Suivant lorsqu’il n’y a plus de page suivante', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.startsWith('/api/drugs')) {
        // Simule être sur la dernière page: pageSize=10, total=20, page=2
        const parsedUrl = new URL(url, 'http://localhost');
        const page = Number(parsedUrl.searchParams.get('page') ?? '1');
        const response: Response = {
          ok: true,
          status: 200,
          json: async () => ({
            page,
            pageSize: 10,
            total: 20,
            items: [],
          }),
        } as unknown as Response;
        return Promise.resolve(response);
      }
      const response: Response = {
        ok: true,
        status: 200,
        json: async () => ({ message: 'pong' }),
      } as unknown as Response;
      return Promise.resolve(response);
    }) as unknown as typeof fetch;

    const wrapper = mount(App);
    await nextTickAll();

    // Passer à la page 2 (dernière)
    const nextButton = wrapper.findAll('button').find((b) => b.text().includes('Suivant'));
    expect(nextButton).toBeTruthy();
    await nextButton!.trigger('click');
    await nextTickAll();

    const buttonsAfter = wrapper.findAll('button');
    const nextAfter = buttonsAfter.find((b) => b.text().includes('Suivant'));
    expect(nextAfter).toBeTruthy();
    expect((nextAfter!.element as HTMLButtonElement).disabled).toBe(true);
  });
});

// Pour les endroits où on utilise wrapper.vm, on peut typer plus finement :

describe('App.vue - tri interne', () => {
  it('retourne la même référence quand aucun sortKey n’est défini', async () => {
    const wrapper = mount(App) as VueWrapper<InstanceType<typeof App>>;
    await nextTickAll();

    const vm = wrapper.vm as unknown as {
      sortKey: string | null;
      drugs: Array<{ id: string }>;
      sortedDrugs: Array<{ id: string }>;
    };

    vm.sortKey = null;

    const sorted = vm.sortedDrugs;

    expect(sorted).toBe(vm.drugs);
  });
});

describe('App.vue - détail médicament', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('charge et affiche le détail lorsqu’on clique sur un médicament', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.startsWith('/api/drugs?')) {
        const response: Response = {
          ok: true,
          status: 200,
          json: async () => ({
            page: 1,
            pageSize: 10,
            total: 1,
            items: [
              {
                id: 'APP-001',
                applicationNumber: 'APP-001',
                sponsorName: 'TEST LAB',
                productName: 'TEST DRUG',
                substanceName: 'TEST SUBSTANCE',
                route: 'ORAL',
              },
            ],
          }),
        } as unknown as Response;
        return Promise.resolve(response);
      }
      if (url.startsWith('/api/drugs/APP-001')) {
        const response: Response = {
          ok: true,
          status: 200,
          json: async () => ({
            applicationNumber: 'APP-001',
            sponsorName: 'TEST LAB',
            products: [
              {
                brandName: 'TEST DRUG',
                genericName: 'GENERIC',
                route: 'ORAL',
                dosageForm: 'TABLET',
                marketingStatus: 'APPROVED',
                productNumber: '001',
                teCode: 'AB',
                strength: '10MG',
                substances: ['SUB-A', 'SUB-B'],
              },
            ],
            documents: [
              {
                type: 'APPROVAL LETTER',
                url: 'https://example.com/doc.pdf',
                effectiveDate: '2010-01-01',
              },
            ],
          }),
        } as unknown as Response;
        return Promise.resolve(response);
      }
      if (url.startsWith('/api/ping')) {
        const response: Response = {
          ok: true,
          status: 200,
          json: async () => ({ message: 'pong' }),
        } as unknown as Response;
        return Promise.resolve(response);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    }) as unknown as typeof fetch;

    const wrapper = mount(App);
    await nextTickAll();

    const row = wrapper.find('tbody tr');
    expect(row.exists()).toBe(true);
    await row.trigger('click');
    await nextTickAll();

    expect(wrapper.text()).toContain('Détail du médicament');
    expect(wrapper.text()).toContain('APP-001');
    expect(wrapper.text()).toContain('TEST LAB');
    expect(wrapper.text()).toContain('TEST DRUG');
    expect(wrapper.text()).toContain('GENERIC');
    expect(wrapper.text()).toContain('ORAL');
    expect(wrapper.text()).toContain('TABLET');
    expect(wrapper.text()).toContain('APPROVED');
    expect(wrapper.text()).toContain('001');
    expect(wrapper.text()).toContain('AB');
    expect(wrapper.text()).toContain('APPROVAL LETTER');
    expect(wrapper.text()).toContain('10MG');
    // date formatée fr-FR -> 01/01/2010
    expect(wrapper.text()).toMatch(/01\/01\/2010/);
  });
});

describe('App.vue - affichage des fallback "—"', () => {
  it('affiche des tirets pour les valeurs nulles dans la liste', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.startsWith('/api/drugs')) {
        const response: Response = {
          ok: true,
          status: 200,
          json: async () => ({
            page: 1,
            pageSize: 10,
            total: 1,
            items: [
              {
                id: 'APP-NULLS',
                applicationNumber: null,
                sponsorName: null,
                productName: null,
                substanceName: null,
                route: null,
              },
            ],
          }),
        } as unknown as Response;
        return Promise.resolve(response);
      }
      if (url.startsWith('/api/ping')) {
        const response: Response = {
          ok: true,
          status: 200,
          json: async () => ({ message: 'pong' }),
        } as unknown as Response;
        return Promise.resolve(response);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    }) as unknown as typeof fetch;

    const wrapper = mount(App);
    await nextTickAll();

    const row = wrapper.find('tbody tr');
    expect(row.exists()).toBe(true);
    const cells = row.findAll('td');
    // toutes les colonnes devraient afficher "—"
    cells.forEach((cell) => {
      expect(cell.text()).toBe('—');
    });
  });
});

describe('App.vue - comportement de setSort', () => {
  it('bascule la direction du tri quand la même colonne est cliquée deux fois', async () => {
    const wrapper = mount(App) as VueWrapper<InstanceType<typeof App>>;
    await nextTickAll();

    const vm = wrapper.vm as unknown as {
      sortKey: string | null;
      sortDirection: 'asc' | 'desc';
      setSort: (key: string) => void;
    };

    expect(vm.sortKey).toBe('productName');
    expect(vm.sortDirection).toBe('asc');

    vm.setSort('productName');
    expect(vm.sortDirection).toBe('desc');

    vm.setSort('productName');
    expect(vm.sortDirection).toBe('asc');
  });

  it('change la colonne de tri et réinitialise en asc', async () => {
    const wrapper = mount(App) as VueWrapper<InstanceType<typeof App>>;
    await nextTickAll();

    const vm = wrapper.vm as unknown as {
      sortKey: string | null;
      sortDirection: 'asc' | 'desc';
      setSort: (key: string) => void;
    };

    vm.setSort('sponsorName');
    expect(vm.sortKey).toBe('sponsorName');
    expect(vm.sortDirection).toBe('asc');
  });
});

describe('App.vue - état de détail vide et erreur de détail', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('affiche le hint de détail vide quand aucun médicament n’est sélectionné', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.startsWith('/api/drugs')) {
        const response: Response = {
          ok: true,
          status: 200,
          json: async () => ({ page: 1, pageSize: 10, total: 0, items: [] }),
        } as unknown as Response;
        return Promise.resolve(response);
      }
      if (url.startsWith('/api/ping')) {
        const response: Response = {
          ok: true,
          status: 200,
          json: async () => ({ message: 'pong' }),
        } as unknown as Response;
        return Promise.resolve(response);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    }) as unknown as typeof fetch;

    const wrapper = mount(App);
    await nextTickAll();

    expect(wrapper.text()).toContain('Sélectionnez un médicament dans la liste pour afficher son détail.');
  });

  it('gère une erreur lors du chargement du détail médicament', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.startsWith('/api/drugs?')) {
        const response: Response = {
          ok: true,
          status: 200,
          json: async () => ({
            page: 1,
            pageSize: 10,
            total: 1,
            items: [
              {
                id: 'APP-ERR',
                applicationNumber: 'APP-ERR',
                sponsorName: 'ERR LAB',
                productName: 'ERR DRUG',
                substanceName: 'ERR SUB',
                route: 'ORAL',
              },
            ],
          }),
        } as unknown as Response;
        return Promise.resolve(response);
      }
      if (url.startsWith('/api/drugs/APP-ERR')) {
        const response: Response = {
          ok: false,
          status: 500,
          json: async () => ({}),
        } as unknown as Response;
        return Promise.resolve(response);
      }
      if (url.startsWith('/api/ping')) {
        const response: Response = {
          ok: true,
          status: 200,
          json: async () => ({ message: 'pong' }),
        } as unknown as Response;
        return Promise.resolve(response);
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    }) as unknown as typeof fetch;

    const wrapper = mount(App);
    await nextTickAll();

    const row = wrapper.find('tbody tr');
    await row.trigger('click');
    await nextTickAll();

    // detailError n’est pas directement rendu dans le template, mais on peut au moins s’assurer
    // que le clic ne casse pas le composant et que le texte principal reste affiché.
    expect(wrapper.text()).toContain('ERR LAB');
  });
});
