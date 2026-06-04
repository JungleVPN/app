export const apiRoutes = {
  broadcasts: {
    collection: '/',
    byId: (id: number | string) => `/${id}`,
    messages: (broadcastId: number | string) => `/${broadcastId}/messages`,
    messagesBatch: (broadcastId: number | string) => `/${broadcastId}/messages/batch`,
  },
  payments: {
    stripeCreateSession: '/stripe/create-session',
    yookassaCreateSession: '/yookassa/create-session',
    yookassaSavedMethods: (userId: string) =>
      `/yookassa/saved-methods/${encodeURIComponent(userId)}`,
    yookassaSavedMethodById: (userId: string, id: string) =>
      `/yookassa/saved-methods/${encodeURIComponent(userId)}/${encodeURIComponent(id)}`,
    telegramStarsCreateInvoice: '/telegram-stars/create-invoice',
    telegramStarsPaymentSucceeded: '/telegram-stars/payment-succeeded',
    adminSearchPayments: '/admin/payments/search',
  },
  referrals: {
    collection: '/',
    byInvited: (telegramId: number | string) => `/referrals/by-invited/${telegramId}`,
    rewardAfterPayment: '/referrals/reward-after-payment',
  },
  remnawave: {
    users: '/users',
    userByTelegramId: (telegramId: number | string) => `/users/by-telegram-id/${telegramId}`,
    userByEmail: (email: string) => `/users/by-email/${encodeURIComponent(email)}`,
    userByUuid: (uuid: string) => `/users/${uuid}`,
    revokeUserSubscription: (uuid: string) => `/users/${uuid}/actions/revoke`,
    subscriptionSubpageConfig: (shortUuid: string) => `/subscriptions/subpage-config/${shortUuid}`,
    subscriptionInfoByShortUuid: (shortUuid: string) => `/sub/${shortUuid}/info`,
    subscriptionPageConfig: (uuid: string) => `/subscription-page-configs/${uuid}`,
    userDevices: (userUuid: string) => `/users/${userUuid}/devices`,
    userDevice: (userUuid: string, hwid: string) =>
      `/users/${userUuid}/devices/${encodeURIComponent(hwid)}`,
    telegramPhoto: (telegramId: number | string) => `/users/telegram-photo/${telegramId}`,
    userExtraDevice: (uuid: string) => `/users/${uuid}/extra-device`,
  },
} as const;
