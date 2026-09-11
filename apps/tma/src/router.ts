import {
  AffiliatePage,
  ConnectEmailPage,
  CookiePolicyPage,
  PrivacyPolicyPage,
  ProfileLayout,
  ProtectedPaymentPage,
  ProtectedProfileSubscriptionPage,
  TermsPage,
} from '@workspace/core';
import {
  ProtectedDevicesPage,
  ProtectedMenuPage,
  ProtectedPlansPage,
  ProtectedReferralsPage,
  ProtectedTransactionDetailsPage,
  ProtectedTransactionsPage,
} from '@workspace/core/pages';
import { createMemoryRouter } from 'react-router';
import { TmaRootLayout } from '@/layouts/TmaRootLayout';

/**
 * TMA uses createMemoryRouter (no URL bar). Route paths mirror the web app
 * exactly so both platforms share the same AppRoutes config:
 *
 *   /connectEmail          — onboarding for new Telegram users (no ProfileLayout)
 *   /profile/subscription     — subscription tab
 *   /profile/payments         — payments tab
 *   /profile/devices          — devices tab
 *   /terms                    — terms page
 *   /privacy                  — privacy policy page
 *   /cookies                  — cookie policy page
 *   /affiliates               — public affiliate program page
 *
 * initialEntries: deep-links (e.g. tma.domain.com/profile/payments) are
 * respected by seeding the memory router with window.location.pathname.
 * A bare `/` (default TMA launch URL) is normalised to /profile/subscription
 * so there is always a matched route on first render.
 */

const initialPath =
  !window.location.pathname || window.location.pathname === '/'
    ? '/profile/subscription'
    : window.location.pathname;

export const router = createMemoryRouter(
  [
    {
      Component: TmaRootLayout,
      children: [
        {
          // Account setup for first-time TMA users. No ProfileLayout wrapper
          // because there is no rmnUser yet at this point.
          path: 'connectEmail',
          Component: ConnectEmailPage,
        },
        {
          path: 'profile',
          Component: ProfileLayout,
          children: [
            {
              path: 'subscription',
              Component: ProtectedProfileSubscriptionPage,
            },
            {
              path: 'plans',
              Component: ProtectedPlansPage,
            },
            {
              path: 'payments',
              Component: ProtectedPaymentPage,
            },
            {
              path: 'devices',
              Component: ProtectedDevicesPage,
            },
            {
              path: 'transactions',
              Component: ProtectedTransactionsPage,
            },
            {
              path: 'transactions/:paymentId',
              Component: ProtectedTransactionDetailsPage,
            },
            {
              path: 'menu',
              Component: ProtectedMenuPage,
            },
            {
              path: 'referrals',
              Component: ProtectedReferralsPage,
            },
          ],
        },
        {
          path: 'terms',
          Component: TermsPage,
        },
        {
          path: 'privacy',
          Component: PrivacyPolicyPage,
        },
        {
          path: 'cookies',
          Component: CookiePolicyPage,
        },
        {
          path: 'affiliates',
          Component: AffiliatePage,
        },
      ],
    },
  ],
  {
    initialEntries: [initialPath],
    initialIndex: 0,
  },
);
