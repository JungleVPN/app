import {
  GetSubscriptionPage,
  ProfileLayout,
  ProtectedPaymentPage,
  ProtectedProfileSubscriptionPage,
  SubscriptionPage,
  TermsPage,
} from '@workspace/core';
import { createMemoryRouter } from 'react-router';
import { TmaRootLayout } from '@/layouts/TmaRootLayout';

/**
 * TMA uses createMemoryRouter (no URL bar). Routes mirror web profile/terms/subscription
 * under the root layout; paths are relative to `/`.
 *
 * `/setup` sits outside ProfileLayout intentionally — it is the landing page for
 * new Telegram users who have no remnawave account yet. ProfileLayout redirects
 * here (via AppRoutes.setupPath) when initUser returns null.
 */
export const router = createMemoryRouter(
  [
    {
      Component: TmaRootLayout,
      children: [
        {
          // Account setup for first-time TMA users. No ProfileLayout wrapper
          // because there is no rmnUser yet at this point.
          path: 'setup',
          Component: GetSubscriptionPage,
        },
        {
          Component: ProfileLayout,
          children: [
            {
              index: true,
              Component: ProtectedProfileSubscriptionPage,
            },
            {
              path: 'payments',
              Component: ProtectedPaymentPage,
            },

            {
              path: 'subscription/:shortUuid',
              Component: SubscriptionPage,
            },
          ],
        },
        {
          path: 'terms',
          Component: TermsPage,
        },
      ],
    },
  ],
  {
    initialEntries: ['/'],
    initialIndex: 0,
  },
);
