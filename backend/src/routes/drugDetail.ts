import type { FastifyPluginAsync } from 'fastify';
import { fetchFdaDrugs, type FdaActiveIngredient, type FdaSubmissionDoc } from '../fdaClient.js';

export const drugDetailRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/drugs/:applicationNumber', async (request, reply) => {
    const { applicationNumber } = request.params as { applicationNumber: string };

    if (!applicationNumber) {
      reply.code(400);
      return { message: 'applicationNumber is required' };
    }

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
            const match = s.match(/([0-9]+(?:\.[0-9]+)?)/);
            return match ? parseFloat(match[1]) : Number.POSITIVE_INFINITY;
          };

          return parseStrength(a.strength) - parseStrength(b.strength);
        });

      const allDocs: FdaSubmissionDoc[] = [];
      for (const submission of result.submissions ?? []) {
        for (const doc of submission.application_docs ?? []) {
          allDocs.push(doc);
        }
      }

      allDocs.sort((a, b) => {
        const da = a.date ?? '';
        const db = b.date ?? '';
        return db.localeCompare(da);
      });

      const documents = allDocs.map((doc) => {
        const rawDate = doc.date;
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
};

