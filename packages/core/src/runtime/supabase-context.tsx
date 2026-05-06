import { SupabaseClient } from '@workspace/types';
import { createContext, type ReactNode, useContext } from 'react';

export type SupabaseClientGetter = () => SupabaseClient;

const SupabaseContext = createContext<SupabaseClientGetter | null>(null);

export function SupabaseProvider({
  getClient,
  children,
}: {
  getClient: SupabaseClientGetter;
  children: ReactNode;
}) {
  return <SupabaseContext.Provider value={getClient}>{children}</SupabaseContext.Provider>;
}

export function useSupabaseClient(): SupabaseClient {
  const get = useContext(SupabaseContext);
  if (!get) {
    throw new Error('SupabaseProvider is required for web login pages');
  }
  return get();
}
