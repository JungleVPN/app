import { LandingLayout, ProfileLayout } from '@workspace/core';
import {
  LANDING_PATHS,
  LOCATIONS_PATH,
  MY_IP_PATH,
  PRICING_PATH,
  REFERRALS_PATH,
  WHAT_IS_VPN_PATH,
} from '@workspace/core/utils';
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
  MyIpPage: ComponentType,
) {
  // Every marketing page also routes under each landing's language prefix, e.g. `/ar/pricing`.
  const marketingPages: [string, ComponentType][] = [
    [PRICING_PATH, Pricing],
    [LOCATIONS_PATH, LocationsPage],
    [WHAT_IS_VPN_PATH, WhatIsVpnPage],
    [MY_IP_PATH, MyIpPage],
    [REFERRALS_PATH, ReferralsPage],
  ];

  return [
    {
      Component: WebAppLayout,
      children: [
        ...[...LANDING_PATHS].flatMap((landingPath) => {
          const prefix = landingPath === '/' ? '' : landingPath;
          return [
            {
              path: landingPath,
              Component: LandingLayout,
              children: [{ index: true, Component: Landing }],
            },
            ...marketingPages.map(([path, Page]) => ({
              path: `${prefix}${path}`,
              Component: LandingLayout,
              children: [{ index: true, Component: Page }],
            })),
          ];
        }),
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
            // Static segment, so it wins over `/payment/:planId` below.
            {
              path: '/payment/checkout',
              lazy: () => pages().then((m) => ({ Component: m.GlobalCheckoutPage })),
            },
            {
              path: '/payment/:planId',
              lazy: () => pages().then((m) => ({ Component: m.PreCheckoutPage })),
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
              path: 'payments/:planId?',
              lazy: () => pages().then((m) => ({ Component: m.ProtectedPaymentPage })),
            },
            {
              path: 'checkout',
              lazy: () => pages().then((m) => ({ Component: m.ProtectedGlobalCheckoutPage })),
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
