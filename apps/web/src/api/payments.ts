import { createApiClient, createPaymentsApi } from '@workspace/core/api';
import { coreEnv as env } from '@workspace/core/env';
import { createClient } from '@/lib/supabase/client';

/**
 * Payments API client for the web app.
 * Sends the Supabase session JWT as Authorization: Bearer so the backend can
 * validate identity via HS256 without a shared client secret.
 */
const backendClient = createApiClient({
  baseUrl: env.paymentsUrl,
  getHeaders: async (): Promise<Record<string, string>> => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
    return {};
  },
});

export const paymentsApi = createPaymentsApi(backendClient);
