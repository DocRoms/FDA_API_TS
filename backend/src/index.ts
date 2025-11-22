import Fastify from 'fastify';
import cors from '@fastify/cors';

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
      "connect-src 'self' http://backend:3000 http://localhost:3000",
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
