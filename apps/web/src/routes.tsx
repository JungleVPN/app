import { LandingLayout, ProfileLayout } from '@workspace/core';
import type { ComponentType } from 'react';

import { WebAppLayout } from '@/layouts/WebAppLayout';
import { WebLegalLayout } from '@/layouts/WebLegalLayout';
import { WebPaymentLayout } from '@/layouts/WebPaymentLayout';
import { WebRootLayout } from '@/layouts/WebRootLayout';
import { WebSuccessLayout } from '@/layouts/WebSuccessLayout';

// Loaded on demand via route.lazy so the landing page's initial bundle doesn't
// pull in the entire authenticated app (profile, payments, devices, etc.) —
// see core-web-vitals audit on apps/web LCP/INP.
const pages = () => import('@workspace/core/pages');

export function createRoutes(
  Landing: ComponentType,
  Pricing: ComponentType,
  ReferralsPage: ComponentType,
  LocationsPage: ComponentType,
  WhatIsVpnPage: ComponentType,
) {
  return [
    {
      Component: WebAppLayout,
      children: [
        {
          path: '/',
          Component: LandingLayout,
          children: [{ index: true, Component: Landing }],
        },
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
          path: '/pricing',
          Component: LandingLayout,
          children: [{ index: true, Component: Pricing }],
        },
        {
          path: '/locations',
          Component: LandingLayout,
          children: [{ index: true, Component: LocationsPage }],
        },
        {
          path: '/what-is-vpn',
          Component: LandingLayout,
          children: [{ index: true, Component: WhatIsVpnPage }],
        },
        {
          path: '/referrals',
          Component: LandingLayout,
          children: [
            {
              index: true,
              Component: ReferralsPage,
            },
          ],
        },
        {
          Component: WebRootLayout,
          children: [
            { path: '/login', lazy: () => pages().then((m) => ({ Component: m.LoginPage })) },
            {
              path: '/login/confirm',
              lazy: () => pages().then((m) => ({ Component: m.ConfirmPage })),
            },
            {
              path: '/affiliates',
              lazy: () => pages().then((m) => ({ Component: m.AffiliatePage })),
            },
          ],
        },

        {
          Component: WebPaymentLayout,
          children: [
            // Static segment, so it wins over `/payment/:planSlug` below.
            {
              path: '/payment/checkout',
              lazy: () => pages().then((m) => ({ Component: m.PaddleCheckoutPage })),
            },
            {
              path: '/payment/:planSlug',
              lazy: () => pages().then((m) => ({ Component: m.GetSubscriptionPage })),
            },
            {
              path: '/plans',
              lazy: () => pages().then((m) => ({ Component: m.PublicPlansPage })),
            },
          ],
        },
        {
          Component: WebLegalLayout,
          children: [
            { path: '/terms', lazy: () => pages().then((m) => ({ Component: m.TermsPage })) },
            {
              path: '/privacy',
              lazy: () => pages().then((m) => ({ Component: m.PrivacyPolicyPage })),
            },
            {
              path: '/cookies',
              lazy: () => pages().then((m) => ({ Component: m.CookiePolicyPage })),
            },
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
            {
              path: 'plans',
              lazy: () => pages().then((m) => ({ Component: m.ProtectedPlansPage })),
            },
            {
              path: 'payments',
              lazy: () => pages().then((m) => ({ Component: m.ProtectedPaymentPage })),
            },
            {
              path: 'checkout',
              lazy: () => pages().then((m) => ({ Component: m.ProtectedPaddleCheckoutPage })),
            },
            {
              path: 'devices',
              lazy: () => pages().then((m) => ({ Component: m.ProtectedDevicesPage })),
            },
            {
              path: 'transactions',
              lazy: () => pages().then((m) => ({ Component: m.ProtectedTransactionsPage })),
            },
            {
              path: 'transactions/:paymentId',
              lazy: () => pages().then((m) => ({ Component: m.ProtectedTransactionDetailsPage })),
            },
            { path: 'menu', lazy: () => pages().then((m) => ({ Component: m.ProtectedMenuPage })) },
            {
              path: 'referrals',
              lazy: () => pages().then((m) => ({ Component: m.ProtectedReferralsPage })),
            },
          ],
        },
      ],
    },
    // Outside WebAppLayout: the success state deliberately renders without the
    // header so it owns the viewport and offers a single next step.
    {
      Component: WebSuccessLayout,
      children: [
        {
          path: '/payment/success',
          lazy: () => pages().then((m) => ({ Component: m.SubscriptionSuccessPage })),
        },
        {
          path: '/payment/fail',
          lazy: () => pages().then((m) => ({ Component: m.SubscriptionFailPage })),
        },
      ],
    },
  ];
}
