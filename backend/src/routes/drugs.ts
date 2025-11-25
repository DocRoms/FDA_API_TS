import type { FastifyPluginAsync } from 'fastify';
import { fetchFdaDrugs, type FdaResult, type FdaActiveIngredient } from '../fdaClient.js';

export const drugsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/drugs', async (request, reply) => {
    const { page = '1', pageSize = '10', search } = request.query as {
      page?: string;
      pageSize?: string;
      search?: string;
    };

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
};

