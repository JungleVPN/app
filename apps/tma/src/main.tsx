import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import '@workspace/core/core/i18n';
import '@/assets/globals.css';

import { AnalyticsApiProvider, ApiProvider } from '@workspace/core/api';
import { AppRoutesProvider, PaymentsApiProvider } from '@workspace/core/runtime';
import { captureAttribution, captureReferral, initDayjs } from '@workspace/core/utils';
import { analyticsClient } from '@/api/analytics';
import { paymentsApi } from '@/api/payments.ts';
import { backendClient } from '@/api/remnawave';
import { ensureTelegramLaunchParams } from '@/lib/ensure-telegram-launch-params';
import { initTma } from '@/lib/tma-sdk';
import { router } from '@/router';

initDayjs();

const appRoutes = {
  paymentReturnPath: '/profile/subscription',
  authGateRedirectPath: '/getSubscription',
  affiliatesPath: '/affiliates',
  profileSubscriptionPath: '/profile/subscription',
  profilePaymentPath: '/profile/payments',
  profilePlansPath: '/profile/plans',
  profileDevicesPath: '/profile/devices',
  profileExtraDevicePurchasePath: '/profile/devices/extra',
  profileTransactionsPath: '/profile/transactions',
  profileMenuPath: '/profile/menu',
  profileReferralsPath: '/profile/referrals',
  getSubscriptionPath: '/getSubscription',
};

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing #root element');
}

void (async () => {
  try {
    const launchParams = ensureTelegramLaunchParams();
    const { tgWebAppPlatform: platform } = launchParams;
    const debug =
      (launchParams.tgWebAppStartParam || '').includes('debug') ||
      import.meta.env.NODE_ENV !== 'production';

    captureAttribution({
      platform: 'telegram',
      startParam: new URLSearchParams(window.location.search).get('adCode') ?? undefined,
    });
    captureReferral();

    await initTma({
      debug,
      eruda: debug && ['ios', 'android'].includes(platform),
      mockForMacOS: platform === 'macos',
    });

    createRoot(root).render(
      <StrictMode>
        <AppRoutesProvider value={appRoutes}>
          <PaymentsApiProvider api={paymentsApi}>
            <AnalyticsApiProvider client={analyticsClient}>
              <ApiProvider client={backendClient}>
                <RouterProvider router={router} />
              </ApiProvider>
            </AnalyticsApiProvider>
          </PaymentsApiProvider>
        </AppRoutesProvider>
      </StrictMode>,
    );
  } catch (e) {
    console.error('[TMA bootstrap]', e);
    const message = e instanceof Error ? e.message : String(e);
    createRoot(root).render(
      <div
        style={{
          padding: 16,
          fontFamily: 'system-ui, sans-serif',
          maxWidth: 480,
          margin: '24px auto',
        }}
      >
        <strong>Mini App failed to start</strong>
        <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message}
        </pre>
        {import.meta.env.DEV ? (
          <p style={{ marginTop: 12, opacity: 0.85 }}>
            If you opened this URL in a normal browser, launch params are mocked in dev only. For
            real Telegram behavior, open the app inside Telegram (same tunnel URL as the Mini App
            URL).
          </p>
        ) : null}
      </div>,
    );
  }
})();
