import { createContext, type ReactNode, useContext } from 'react';

/**
 * App-specific route paths that differ between web and TMA.
 * Provided once at the app root via AppRoutesProvider.
 */
export interface AppRoutes {
  paymentReturnPath: string;
  authGateRedirectPath: string;
  profileSubscriptionPath: string;
  profilePaymentPath: string;
  profileDevicesPath: string;
  profileMenuPath: string;
  profileExtraDevicePurchasePath: string;
  profileTransactionsPath: string;
  getSubscriptionPath: string;
}

const AppRoutesContext = createContext<AppRoutes | null>(null);

export function AppRoutesProvider({ value, children }: { value: AppRoutes; children: ReactNode }) {
  return <AppRoutesContext.Provider value={value}>{children}</AppRoutesContext.Provider>;
}

export function useAppRoutes(): AppRoutes {
  const ctx = useContext(AppRoutesContext);
  if (!ctx) {
    throw new Error('useAppRoutes() must be used inside <AppRoutesProvider>');
  }
  return ctx;
}
