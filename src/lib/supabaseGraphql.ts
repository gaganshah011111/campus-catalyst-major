import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from './supabase';

interface GraphQLError {
  message?: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

/**
 * Lightweight helper to call the Supabase GraphQL endpoint. We prefer GraphQL for
 * entities like `banners` because some browser extensions block the REST endpoint
 * when the path contains the word "banner". GraphQL routes avoid those filters.
 */
export const callSupabaseGraphQL = async <T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> => {
  const { data: sessionData } = await supabase.auth.getSession();

  const response = await fetch(`${SUPABASE_URL}/graphql/v1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${sessionData.session?.access_token ?? SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}`);
  }

  const payload: GraphQLResponse<T> = await response.json();

  if (payload.errors?.length) {
    const combinedMessage =
      payload.errors
        .map((err) => err.message)
        .filter(Boolean)
        .join('; ') || 'Unknown GraphQL error';
    throw new Error(combinedMessage);
  }

  if (!payload.data) {
    throw new Error('GraphQL response did not include a data payload');
  }

  return payload.data;
};


