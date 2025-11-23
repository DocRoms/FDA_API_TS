export interface FdaSearchParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface FdaActiveIngredient {
  name?: string;
  strength?: string;
}

export interface FdaProduct {
  brand_name?: string;
  generic_name?: string;
  active_ingredients?: FdaActiveIngredient[];
  route?: string;
  dosage_form?: string;
  marketing_status?: string;
  product_number?: string;
  te_code?: string;
  strength?: string;
}

export interface FdaSubmissionDoc {
  id?: string;
  url?: string;
  date?: string; // format AAAAMMJJ
  type?: string; // Label, Letter, Review, etc.
}

export interface FdaSubmission {
  submission_type?: string;
  submission_number?: string;
  submission_status?: string;
  submission_status_date?: string;
  application_docs?: FdaSubmissionDoc[];
}

export interface FdaResult {
  application_number?: string;
  sponsor_name?: string;
  products?: FdaProduct[];
  submissions?: FdaSubmission[];
}

export interface FdaResultsMeta {
  results?: {
    total?: number;
  };
}

export interface FdaResponse {
  results?: FdaResult[];
  meta?: FdaResultsMeta;
}

export async function fetchFdaDrugs(params: FdaSearchParams): Promise<FdaResponse> {
  const { search, page = 1, pageSize = 10 } = params;
  const from = (page - 1) * pageSize;
  const limit = pageSize;

  const query = new URLSearchParams();
  query.set('skip', String(from));
  query.set('limit', String(limit));

  if (search && search.trim().length > 0) {
    const q = search.trim();
    const clauses = [
      `products.brand_name:"${q}"`,
      `products.generic_name:"${q}"`,
      `products.active_ingredients.name:"${q}"`,
      `products.route:"${q}"`,
      `sponsor_name:"${q}"`,
      `application_number:"${q}"`,
    ];
    query.set('search', `(${clauses.join(' OR ')})`);
  }

  const url = `https://api.fda.gov/drug/drugsfda.json?${query.toString()}`;

  // Log technique pour suivre les appels à l’API FDA
  // (les logs de stdout/stderr sont récupérés par Fastify / Docker)
  console.log('[FDA] Request URL:', url);

  const res = await fetch(url);

  if (res.status === 404) {
    return { results: [], meta: { results: { total: 0 } } };
  }

  if (!res.ok) {
    throw new Error(`FDA API error: ${res.status}`);
  }

  const data = (await res.json()) as unknown;
  return data as FdaResponse;
}
