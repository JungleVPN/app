import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { coreEnv as env } from '@workspace/core/env';

let client: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (!client) {
    client = createSupabaseClient(env.supabaseUrl, env.supabaseAnonKey);
  }
  return client;
}
