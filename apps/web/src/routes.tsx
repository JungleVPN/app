import { LandingLayout, ProfileLayout } from '@workspace/core';
import type { ComponentType } from 'react';

import { WebAppLayout } from '@/layouts/WebAppLayout';
import { WebLegalLayout } from '@/layouts/WebLegalLayout';
import { WebRootLayout } from '@/layouts/WebRootLayout';

// Loaded on demand via route.lazy so the landing page's initial bundle doesn't
// pull in the entire authenticated app (profile, payments, devices, etc.) —
// see core-web-vitals audit on apps/web LCP/INP.
const pages = () => import('@workspace/core/pages');

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
            { path: '/subscribe', lazy: () => pages().then((m) => ({ Component: m.GetSubscriptionPage })) },
            { path: '/login', lazy: () => pages().then((m) => ({ Component: m.LoginPage })) },
            { path: '/login/confirm', lazy: () => pages().then((m) => ({ Component: m.ConfirmPage })) },
            {
              path: '/subscription/:shortUuid',
              lazy: () => pages().then((m) => ({ Component: m.SubscriptionPage })),
            },
            { path: '/affiliates', lazy: () => pages().then((m) => ({ Component: m.AffiliatePage })) },
          ],
        },
        {
          Component: WebLegalLayout,
          children: [
            { path: '/terms', lazy: () => pages().then((m) => ({ Component: m.TermsPage })) },
            { path: '/privacy', lazy: () => pages().then((m) => ({ Component: m.PrivacyPolicyPage })) },
          ],
        },
        {
          path: '/profile',
          Component: ProfileLayout,
          children: [
            {
              path: 'subscription',
              lazy: () => pages().then((m) => ({ Component: m.ProtectedProfileSubscriptionPage })),
            },
            { path: 'plans', lazy: () => pages().then((m) => ({ Component: m.ProtectedPlansPage })) },
            { path: 'payments', lazy: () => pages().then((m) => ({ Component: m.ProtectedPaymentPage })) },
            { path: 'devices', lazy: () => pages().then((m) => ({ Component: m.ProtectedDevicesPage })) },
            {
              path: 'transactions',
              lazy: () => pages().then((m) => ({ Component: m.ProtectedTransactionsPage })),
            },
            {
              path: 'transactions/:paymentId',
              lazy: () => pages().then((m) => ({ Component: m.ProtectedTransactionDetailsPage })),
            },
            { path: 'menu', lazy: () => pages().then((m) => ({ Component: m.ProtectedMenuPage })) },
            { path: 'referrals', lazy: () => pages().then((m) => ({ Component: m.ProtectedReferralsPage })) },
          ],
        },
      ],
    },
  ];
}
