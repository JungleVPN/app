import { LandingLayout, ProfileLayout } from '@workspace/core';
import {
  AffiliatePage,
  ConfirmPage,
  GetSubscriptionPage,
  LandingPage,
  LoginPage,
  ProtectedDevicesPage,
  ProtectedExtraDevicePurchasePage,
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
import { createBrowserRouter } from 'react-router';

import { WebRootLayout } from '@/layouts/WebRootLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: LandingLayout,
    children: [
      {
        index: true,
        Component: LandingPage,
      },
    ],
  },
  {
    Component: WebRootLayout,
    children: [
      {
        path: '/subscribe',
        Component: GetSubscriptionPage,
      },
      {
        path: '/login',
        Component: LoginPage,
      },
      {
        path: '/login/confirm',
        Component: ConfirmPage,
      },
      {
        path: '/profile',
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
            path: 'devices/extra',
            Component: ProtectedExtraDevicePurchasePage,
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
        path: '/subscription/:shortUuid',
        Component: SubscriptionPage,
      },
      {
        path: '/terms',
        Component: TermsPage,
      },
      {
        path: '/affiliates',
        Component: AffiliatePage,
      },
    ],
  },
]);
