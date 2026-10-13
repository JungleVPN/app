import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import '@workspace/core/core/i18n';
import '@/assets/globals.css';

import { AnalyticsApiProvider, ApiProvider } from '@workspace/core/api';
import { AppRoutesProvider, PaymentsApiProvider, SupabaseProvider } from '@workspace/core/runtime';
import { captureAttribution, captureReferral, initDayjs } from '@workspace/core/utils';
import { analyticsClient } from '@/api/analytics';
import { paymentsApi } from '@/api/payments';
import { backendClient } from '@/api/remnawave';
import { createClient } from '@/lib/supabase/client';
import { WebAuthProvider } from '@/providers/WebAuthProvider';
import { createAppRouter, preloadMatchedRoutes } from '@/router.ts';

initDayjs();
captureAttribution({ platform: 'web' });
captureReferral();

const appRoutes = {
  paymentReturnPath: '/payment/success',
  paymentFailPath: '/payment/fail',
  authGateRedirectPath: '/login',
  affiliatesPath: '/affiliates',
  publicPlansPath: '/plans',
  profileSubscriptionPath: '/profile/subscription',
  profilePaymentPath: '/profile/payments',
  profilePlansPath: '/profile/plans',
  profileDevicesPath: '/profile/devices',
  profileExtraDevicePurchasePath: '/profile/devices/extra',
  profileTransactionsPath: '/profile/transactions',
  profileMenuPath: '/profile/menu',
  profileReferralsPath: '/profile/referrals',
  getConnectEmailPath: '/connectEmail',
  getSubscriptionPath: (planId: string) => `/payment/${planId}`,
};

const rootEl = document.getElementById('root')!;
const isServerRendered = rootEl.querySelector('*') !== null;

function renderApp() {
  const app = (
    <StrictMode>
      <AppRoutesProvider value={appRoutes}>
        <PaymentsApiProvider api={paymentsApi}>
          <AnalyticsApiProvider client={analyticsClient}>
            <SupabaseProvider getClient={createClient}>
              <WebAuthProvider>
                <ApiProvider client={backendClient}>
                  <RouterProvider router={createAppRouter()} />
                </ApiProvider>
              </WebAuthProvider>
            </SupabaseProvider>
          </AnalyticsApiProvider>
        </PaymentsApiProvider>
      </AppRoutesProvider>
    </StrictMode>
  );

  // Use hydrateRoot when the SSR server pre-rendered HTML, createRoot otherwise (local vite dev).
  if (isServerRendered) {
    hydrateRoot(rootEl, app);
  } else {
    createRoot(rootEl).render(app);
  }
}

// Lazy routes are resolved before the first render. When hydrating, the first client render
// would otherwise be an empty shell where the server rendered a full page — see
// preloadMatchedRoutes. Without server markup (local vite dev) it keeps the router initialised,
// so React Router has no `HydrateFallback` to ask for while it loads them itself.
void preloadMatchedRoutes(window.location.pathname).then(renderApp);
