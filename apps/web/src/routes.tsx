import { LandingLayout, ProfileLayout } from '@workspace/core';
import {
  AffiliatePage,
  ConfirmPage,
  GetSubscriptionPage,
  LoginPage,
  PrivacyPolicyPage,
  ProtectedDevicesPage,
  ProtectedMenuPage,
  ProtectedPaymentPage,
  ProtectedPlansPage,
  ProtectedProfileSubscriptionPage,
  ProtectedReferralsPage,
  ProtectedTransactionDetailsPage,
  ProtectedTransactionsPage,
  SubscriptionPage,
  TermsPage,
} from '@workspace/core/pages';
import type { ComponentType } from 'react';

import { WebAppLayout } from '@/layouts/WebAppLayout';
import { WebLegalLayout } from '@/layouts/WebLegalLayout';
import { WebRootLayout } from '@/layouts/WebRootLayout';

export function createRoutes(Landing: ComponentType) {
  return [
    {
      Component: WebAppLayout,
      children: [
        {
          path: '/',
          Component: LandingLayout,
          children: [{ index: true, Component: Landing }],
        },
        // Global-domain language routing (jungle-vpn.com): /en, /ar and /tr serve
        // the same landing page, with the active language picked up by i18n's path
        // detector — see packages/core/src/core/i18n/i18n.ts.
        {
          path: '/en',
          Component: LandingLayout,
          children: [{ index: true, Component: Landing }],
        },
        {
          path: '/ar',
          Component: LandingLayout,
          children: [{ index: true, Component: Landing }],
        },
        {
          path: '/tr',
          Component: LandingLayout,
          children: [{ index: true, Component: Landing }],
        },
        {
          Component: WebRootLayout,
          children: [
            { path: '/subscribe', Component: GetSubscriptionPage },
            { path: '/login', Component: LoginPage },
            { path: '/login/confirm', Component: ConfirmPage },
            { path: '/subscription/:shortUuid', Component: SubscriptionPage },
            { path: '/affiliates', Component: AffiliatePage },
          ],
        },
        {
          Component: WebLegalLayout,
          children: [
            { path: '/terms', Component: TermsPage },
            { path: '/privacy', Component: PrivacyPolicyPage },
          ],
        },
        {
          path: '/profile',
          Component: ProfileLayout,
          children: [
            { path: 'subscription', Component: ProtectedProfileSubscriptionPage },
            { path: 'plans', Component: ProtectedPlansPage },
            { path: 'payments', Component: ProtectedPaymentPage },
            { path: 'devices', Component: ProtectedDevicesPage },
            { path: 'transactions', Component: ProtectedTransactionsPage },
            { path: 'transactions/:paymentId', Component: ProtectedTransactionDetailsPage },
            { path: 'menu', Component: ProtectedMenuPage },
            { path: 'referrals', Component: ProtectedReferralsPage },
          ],
        },
      ],
    },
  ];
}
