import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { type AnalyticsApi, createAnalyticsApi } from './apps/analytics';
import type { ApiClient } from './client';

const AnalyticsApiContext = createContext<AnalyticsApi | null>(null);

export function AnalyticsApiProvider({
  client,
  children,
}: {
  client: ApiClient;
  children: ReactNode;
}) {
  const api = useMemo(() => createAnalyticsApi(client), [client]);
  return <AnalyticsApiContext.Provider value={api}>{children}</AnalyticsApiContext.Provider>;
}

export function useAnalyticsApi(): AnalyticsApi {
  const api = useContext(AnalyticsApiContext);
  if (!api) throw new Error('useAnalyticsApi must be used within <AnalyticsApiProvider>');
  return api;
}
