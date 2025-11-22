import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import cors from '@fastify/cors';

import '../src/index';

describe('GET /ping', () => {
  it('should return pong', async () => {
    const app = Fastify();
    await app.register(cors, {
      origin: ['http://localhost:5173'],
    });
    app.get('/ping', async () => {
      return { message: 'pong' };
    });

    const response = await app.inject({
      method: 'GET',
      url: '/ping',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('pong');
  });
});

