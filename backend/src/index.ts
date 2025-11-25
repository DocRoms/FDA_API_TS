import Fastify from 'fastify';
import cors from '@fastify/cors';
import { fetchFdaDrugs, type FdaResult, type FdaActiveIngredient, type FdaSubmissionDoc } from './fdaClient.js';

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

    // Cache côté client et proxy pendant 3 heures pour la liste
    reply.header('Cache-Control', 'public, max-age=10800, s-maxage=10800');

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

  server.get('/drugs/:applicationNumber', async (request, reply) => {
    const { applicationNumber } = request.params as { applicationNumber: string };

    if (!applicationNumber) {
      reply.code(400);
      return { message: 'applicationNumber is required' };
    }

    // Cache côté client et proxy pendant 24 heures pour le détail
    reply.header('Cache-Control', 'public, max-age=86400, s-maxage=86400');

    try {
      const data = await fetchFdaDrugs({
        search: applicationNumber,
        page: 1,
        pageSize: 1,
      });

      const result = data.results?.[0];
      if (!result) {
        reply.code(404);
        return { message: 'Drug not found' };
      }

      const products = (result.products ?? [])
        .map((p) => {
          const substancesArray = p.active_ingredients ?? [];
          const substances = substancesArray
            .map((ai: FdaActiveIngredient) => ai.name)
            .filter((name): name is string => Boolean(name)) ?? [];

          const strengths = substancesArray
            .map((ai: FdaActiveIngredient & { strength?: string }) => ai.strength)
            .filter((s): s is string => Boolean(s));

          const strength = strengths.length ? strengths.join(' / ') : null;

          return {
            brandName: p.brand_name ?? null,
            genericName: p.generic_name ?? null,
            route: p.route ?? null,
            dosageForm: p.dosage_form ?? null,
            marketingStatus: p.marketing_status ?? null,
            productNumber: p.product_number ?? null,
            teCode: p.te_code ?? null,
            strength,
            substances,
          };
        })
        .sort((a, b) => {
          const parseStrength = (s: string | null) => {
            if (!s) return Number.POSITIVE_INFINITY;
            // on prend la première composante numérique trouvée, ex: "50MG" -> 50
            const match = s.match(/([0-9]+(?:\.[0-9]+)?)/);
            return match ? parseFloat(match[1]) : Number.POSITIVE_INFINITY;
          };

          return parseStrength(a.strength) - parseStrength(b.strength);
        });

      const allDocs: FdaSubmissionDoc[] = [];
      for (const submission of (result.submissions ?? [])) {
        for (const doc of submission.application_docs ?? []) {
          allDocs.push(doc);
        }
      }

      // Trier les documents par date décroissante (les plus récents d'abord)
      allDocs.sort((a, b) => {
        const da = a.date ?? '';
        const db = b.date ?? '';
        // format AAAAMMJJ : l'ordre lexicographique correspond à l'ordre chronologique
        return db.localeCompare(da);
      });

      const documents = allDocs.map((doc) => {
        const rawDate = doc.date; // format AAAAMMJJ
        let effectiveDate: string | null = null;
        if (rawDate && /^\d{8}$/.test(rawDate)) {
          const year = rawDate.substring(0, 4);
          const month = rawDate.substring(4, 6);
          const day = rawDate.substring(6, 8);
          effectiveDate = `${year}-${month}-${day}`;
        }

        return {
          type: doc.type ?? null,
          url: doc.url ?? null,
          effectiveDate,
        };
      });

      return {
        applicationNumber: result.application_number ?? applicationNumber,
        sponsorName: result.sponsor_name ?? null,
        products,
        documents,
      };
    } catch (error: unknown) {
      request.log.error({ err: error }, 'Error fetching FDA drug detail');
      reply.code(502);
      return { message: 'Failed to fetch FDA detail' };
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
