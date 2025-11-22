import Fastify from 'fastify';
import cors from '@fastify/cors';
import { fetchFdaDrugs, type FdaResult, type FdaActiveIngredient } from './fdaClient.js';

const server = Fastify({
  logger: true,
});

async function buildServer() {
  await server.register(cors, {
    origin: ['http://localhost:5173'],
  });

  server.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('X-XSS-Protection', '0');
    reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    const csp = [
      "default-src 'none'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self' http://backend:3000 http://localhost:3000 https://api.fda.gov",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');

    reply.header('Content-Security-Policy', csp);
  });

  server.get('/ping', async () => {
    return { message: 'pong', timestamp: new Date().toISOString() };
  });

  server.get('/drugs', async (request, reply) => {
    const { page = '1', pageSize = '10', search } = request.query as {
      page?: string;
      pageSize?: string;
      search?: string;
    };

    const pageNum = Math.max(1, Number(page) || 1);
    const sizeNum = Math.min(100, Math.max(1, Number(pageSize) || 10));

    try {
      const data = await fetchFdaDrugs({
        search,
        page: pageNum,
        pageSize: sizeNum,
      });

      const results = data.results ?? [];
      const total = data.meta?.results?.total ?? results.length;

      const items = results.map((item: FdaResult) => {
        const product = item.products?.[0];
        const substances = product?.active_ingredients
          ?.map((ai: FdaActiveIngredient) => ai.name)
          .filter((name): name is string => Boolean(name))
          .join(', ') ?? null;

        return {
          id: item.application_number ?? item.sponsor_name ?? 'unknown',
          applicationNumber: item.application_number ?? null,
          sponsorName: item.sponsor_name ?? null,
          productName: product?.brand_name ?? null,
          substanceName: substances,
          route: product?.route ?? null,
        };
      });

      return {
        page: pageNum,
        pageSize: sizeNum,
        total,
        items,
      };
    } catch (error: unknown) {
      request.log.error({ err: error }, 'Error fetching FDA drugs');
      reply.code(502);
      return { message: 'Failed to fetch FDA data' };
    }
  });

  const port = Number(process.env.PORT) || 3000;
  const host = '0.0.0.0';

  try {
    await server.listen({ port, host });
    server.log.info(`Server listening on http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

buildServer();
