import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
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
import { router } from '@/router.ts';

initDayjs();
captureAttribution({ platform: 'web' });
captureReferral();

const appRoutes = {
  paymentReturnPath: '/profile/subscription',
  authGateRedirectPath: '/login',
  affiliatesPath: '/affiliates',
  profileSubscriptionPath: '/profile/subscription',
  profilePaymentPath: '/profile/payments',
  profileDevicesPath: '/profile/devices',
  profileExtraDevicePurchasePath: '/profile/devices/extra',
  profileTransactionsPath: '/profile/transactions',
  profileMenuPath: '/profile/menu',
  profileReferralsPath: '/profile/referrals',
  getSubscriptionPath: '/',
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRoutesProvider value={appRoutes}>
      <PaymentsApiProvider api={paymentsApi}>
        <AnalyticsApiProvider client={analyticsClient}>
          <SupabaseProvider getClient={createClient}>
            <WebAuthProvider>
              <ApiProvider client={backendClient}>
                <RouterProvider router={router} />
              </ApiProvider>
            </WebAuthProvider>
          </SupabaseProvider>
        </AnalyticsApiProvider>
      </PaymentsApiProvider>
    </AppRoutesProvider>
  </StrictMode>,
);
