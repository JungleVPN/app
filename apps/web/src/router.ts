import { ProfileLayout, ProtectedAffiliatePage } from '@workspace/core';
import {
  ConfirmPage,
  GetSubscriptionPage,
  LoginPage,
  ProtectedDevicesPage,
  ProtectedExtraDevicePurchasePage,
  ProtectedMenuPage,
  ProtectedPaymentPage,
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
    Component: WebRootLayout,
    children: [
      {
        path: '/',
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
          {
            path: 'affiliates',
            Component: ProtectedAffiliatePage,
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
    ],
  },
]);
