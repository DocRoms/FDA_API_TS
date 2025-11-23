import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import cors from '@fastify/cors';

// Petit serveur de test focalisé sur /drugs, sans appel réel à l'API FDA
const buildTestServer = () => {
  const app = Fastify();

  app.register(cors, {
    origin: ['http://localhost:5173'],
  });

  app.get('/drugs', async () => {
    return {
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
        },
      ],
    };
  });

  app.get('/drugs/:applicationNumber', async (request) => {
    const { applicationNumber } = request.params as { applicationNumber: string };
    if (applicationNumber !== 'APP-001') {
      return { message: 'Drug not found' };
    }
    return {
      applicationNumber: 'APP-001',
      sponsorName: 'TEST LAB',
      products: [
        {
          brandName: 'TEST DRUG',
          genericName: 'GENERIC',
          route: 'ORAL',
          substances: ['SUB-A', 'SUB-B'],
        },
      ],
    };
  });

  return app;
};

describe('GET /drugs', () => {
  const app = buildTestServer();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a paginated list with the expected shape', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/drugs?page=1&pageSize=10',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(10);
    expect(body.total).toBe(1);
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items).toHaveLength(1);

    const item = body.items[0];
    expect(item.id).toBe('APP-001');
    expect(item.applicationNumber).toBe('APP-001');
    expect(item.sponsorName).toBe('TEST LAB');
    expect(item.productName).toBe('TEST DRUG');
    expect(item.substanceName).toBe('TEST SUBSTANCE');
  });
});

describe('GET /drugs/:applicationNumber', () => {
  const app = buildTestServer();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a detailed view for a known application number', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/drugs/APP-001',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body.applicationNumber).toBe('APP-001');
    expect(body.sponsorName).toBe('TEST LAB');
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.products[0].brandName).toBe('TEST DRUG');
  });
});
