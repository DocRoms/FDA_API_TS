import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import cors from '@fastify/cors';

const buildTestServer = () => {
  const app = Fastify();

  app.register(cors, {
    origin: ['http://localhost:5173'],
  });

  app.get('/ping', async () => {
    return { message: 'pong' };
  });

  return app;
};

describe('GET /ping', () => {
  const app = buildTestServer();

  it('returns pong', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/ping',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('pong');
  });
});
