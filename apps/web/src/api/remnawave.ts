import { createApiClient } from '@workspace/core/api';
import { coreEnv as env } from '@workspace/core/env';
import { createClient } from '@/lib/supabase/client';

export const backendClient = createApiClient({
  baseUrl: env.remnawaveUrl,
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
