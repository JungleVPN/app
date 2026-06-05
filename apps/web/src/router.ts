import { ProfileLayout } from '@workspace/core';
import {
  ConfirmPage,
  GetSubscriptionPage,
  LoginPage,
  ProtectedAdminPaymentDetailsPage,
  ProtectedAdminPaymentsPage,
  ProtectedDevicesPage,
  ProtectedExtraDevicePurchasePage,
  ProtectedPaymentPage,
  ProtectedProfileSubscriptionPage,
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
            path: 'admin',
            Component: ProtectedAdminPaymentsPage,
          },
          {
            path: 'admin/:paymentId',
            Component: ProtectedAdminPaymentDetailsPage,
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
