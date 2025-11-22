import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import App from './App.vue';

const nextTickAll = async () => {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('App.vue', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.startsWith('/api/drugs')) {
        return Promise.resolve({
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
        }) as any;
      }
      if (url.startsWith('/api/ping')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ message: 'pong' }),
        }) as any;
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    }) as any;
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
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ page: 1, pageSize: 10, total: 0, items: [] }),
        }) as any;
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ message: 'pong' }),
      }) as any;
    }) as any;

    const wrapper = mount(App);
    await nextTickAll();

    expect(wrapper.text()).toContain('Aucun résultat pour ces critères');
  });

  it('gère une erreur lors du chargement des médicaments', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.startsWith('/api/drugs')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({}),
        }) as any;
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ message: 'pong' }),
      }) as any;
    }) as any;

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

    expect(global.fetch).toHaveBeenCalled();
    const call = (global.fetch as any).mock.calls.pop();
    const parsedUrl = new URL(call[0].toString(), 'http://localhost');
    expect(parsedUrl.searchParams.get('search')).toBe('TEST QUERY');
    expect(parsedUrl.searchParams.get('page')).toBe('1');
  });

  it('permet de trier par laboratoire', async () => {
    const wrapper = mount(App);

    await nextTickAll();

    // tri initial: par productName asc
    let rows = wrapper.findAll('tbody tr');
    expect(rows[0].text()).toContain('A-DRUG');

    // cliquer sur la colonne Laboratoire pour trier par sponsorName
    const headers = wrapper.findAll('th');
    const sponsorHeader = headers[2];
    await sponsorHeader.trigger('click');
    await nextTickAll();

    rows = wrapper.findAll('tbody tr');
    // A-LAB doit arriver en premier
    expect(rows[0].text()).toContain('A-LAB');
  });

  it('déclenche le changement de page via le bouton Suivant', async () => {
    const wrapper = mount(App);

    await nextTickAll();

    (global.fetch as any).mockClear();

    const nextButton = wrapper.findAll('button').find((b) => b.text().includes('Suivant'));
    expect(nextButton).toBeTruthy();

    await nextButton!.trigger('click');
    await nextTickAll();

    expect(global.fetch).toHaveBeenCalled();
    const call = (global.fetch as any).mock.calls[0];
    const parsedUrl = new URL(call[0].toString(), 'http://localhost');
    expect(parsedUrl.searchParams.get('page')).toBe('2');
  });

  it('affiche une erreur si /ping renvoie une erreur HTTP', async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.startsWith('/api/drugs')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            page: 1,
            pageSize: 10,
            total: 0,
            items: [],
          }),
        }) as any;
      }
      if (url.startsWith('/api/ping')) {
        return Promise.resolve({
          ok: false,
          status: 503,
          json: async () => ({}),
        }) as any;
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    }) as any;

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
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              ok: true,
              status: 200,
              json: async () => ({ page: 1, pageSize: 10, total: 0, items: [] }),
            }) as any,
          20,
        ),
      ),
    ) as any;

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
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            page: 1,
            pageSize: 10,
            total: 100,
            items: [],
          }),
        }) as any;
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ message: 'pong' }),
      }) as any;
    }) as any;

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
        return Promise.resolve({
          ok: false,
          status: 404,
          json: async () => ({}),
        }) as any;
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ message: 'pong' }),
      }) as any;
    }) as any;

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
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            page,
            pageSize: 10,
            total: 20,
            items: [],
          }),
        }) as any;
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ message: 'pong' }),
      }) as any;
    }) as any;

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

describe('App.vue - tri interne', () => {
  it('retourne la même référence quand aucun sortKey n’est défini', async () => {
    const wrapper = mount(App);
    await nextTickAll();

    const vm: any = wrapper.vm;

    // Simuler un état sans sortKey explicite
    vm.sortKey = null;

    const sorted = vm.sortedDrugs as unknown as { id: string }[];

    // Quand sortKey est null, sortedDrugs doit renvoyer exactement la référence de drugs
    expect(sorted).toBe(vm.drugs);
  });
});
