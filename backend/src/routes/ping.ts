import type { FastifyPluginAsync } from 'fastify';

export const pingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/ping', async () => {
    return { message: 'pong', timestamp: new Date().toISOString() };
  });
};
