export const apiRoutes = {
  analytics: {
    trackUserCreated: '/events/user-created',
  },
  bot: {
    notifyPayment: '/notify/payment',
    notifyUserEvent: '/notify/user-event',
    notifyUserRewarded: '/notify/user-rewarded',
    telegramSticker: (fileId: string) => `/telegram/sticker/${fileId}`,
  },
  broadcasts: {
    collection: '/',
    byId: (id: number | string) => `/${id}`,
    messages: (broadcastId: number | string) => `/${broadcastId}/messages`,
    messagesBatch: (broadcastId: number | string) => `/${broadcastId}/messages/batch`,
  },
  payments: {
    stripeCreateSession: '/stripe/create-session',
    stripeSubscription: '/stripe/subscription',
    stripeWebhook: '/stripe/webhook',
    yookassaCreateSession: '/yookassa/create-session',
    yookassaWebhook: '/yookassa/webhook',
    yookassaSavedMethods: '/yookassa/saved-methods',
    yookassaSavedMethodById: (id: string) =>
      `/yookassa/saved-methods/${encodeURIComponent(id)}`,
    telegramStarsCreateInvoice: '/telegram-stars/create-invoice',
    telegramStarsPaymentSucceeded: '/telegram-stars/payment-succeeded',
    promoValidate: '/promo/validate',
    myTransactions: '/my-transactions',
    searchPayments: '/search',
    remnawaveEvent: '/remnawave-event',
  },
  referrals: {
    collection: '/',
    byInvited: (userId: string) => `/by-invited/${encodeURIComponent(userId)}`,
    rewardAfterPayment: '/reward-after-payment',
  },
  remnawave: {
    // ── server-to-server (InterServiceGuard) ─────────────────────────────
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
    userExpiry: (uuid: string) => `/users/${uuid}/expiry`,
    userMetadata: (uuid: string) => `/users/${uuid}/metadata`,
    // ── client-facing (ClientUserGuard — no UUID in path) ─────────────────
    me: '/users/me',
    meMetadata: '/users/me/metadata',
    meDevices: '/users/me/devices',
    meDevice: (hwid: string) => `/users/me/devices/${encodeURIComponent(hwid)}`,
    meTelegramPhoto: '/users/me/telegram-photo',
    meLinkEmail: '/users/me/link-email',
    // ── TMA registration (TelegramCredentialGuard — user may not exist yet) ─
    connectEmail: '/users/connect/email',
  },
} as const;
