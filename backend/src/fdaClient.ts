export interface FdaSearchParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface FdaActiveIngredient {
  name?: string;
}

export interface FdaProduct {
  brand_name?: string;
  generic_name?: string;
  active_ingredients?: FdaActiveIngredient[];
}

export interface FdaResult {
  application_number?: string;
  sponsor_name?: string;
  products?: FdaProduct[];
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
