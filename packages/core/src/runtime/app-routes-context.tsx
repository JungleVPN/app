import { createContext, type ReactNode, useContext } from 'react';

/**
 * App-specific route paths that differ between web and TMA.
 * Provided once at the app root via AppRoutesProvider.
 */
export interface AppRoutes {
  /** Bottom-nav / portal landing (web: `/profile/subscription`, TMA: `/`). */
  subscriptionPortalPath: string;
  /** `return_url` path after payment redirect (web: `/profile/subscription`, TMA: `/`). */
  paymentReturnPath: string;
  /** AuthGuard redirect when there is no session (web: `/login`, TMA: `/`). */
  authGateRedirectPath: string;
  /** Bottom-tab: subscription (web: `/profile/subscription`, TMA: `/`). */
  profileSubscriptionPath: string;
  /** Bottom-tab: payments (web: `/profile/payments`, TMA: `/payments`). */
  profilePaymentPath: string;
  /** Bottom-tab: devices (web: `/profile/devices`, TMA: `/devices`). */
  profileDevicesPath: string;
  /**
   * Where ProfileLayout redirects when no remnawave user is found for the
   * current identity. Web: `/` (GetSubscriptionPage is the home page).
   * TMA: `/setup` (dedicated route outside ProfileLayout).
   */
  setupPath: string;
}

const AppRoutesContext = createContext<AppRoutes | null>(null);

export function AppRoutesProvider({
  value,
  children,
}: {
  value: AppRoutes;
  children: ReactNode;
}) {
  return <AppRoutesContext.Provider value={value}>{children}</AppRoutesContext.Provider>;
}

export function useAppRoutes(): AppRoutes {
  const ctx = useContext(AppRoutesContext);
  if (!ctx) {
    throw new Error('useAppRoutes() must be used inside <AppRoutesProvider>');
  }
  return ctx;
}
