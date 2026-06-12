function track(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
  if (typeof g !== 'function') return;
  g('event', event, params ?? {});
}

export const analytics = {
  initialPageViewed: (platform: 'web' | 'telegram') => track('initial_page_viewed', { platform }),

  signUp: (platform: 'web' | 'telegram') => track('sign_up', { method: platform }),

  login: (platform: 'web' | 'telegram') => track('login', { method: platform }),

  subscriptionViewed: () => track('subscription_viewed'),

  beginCheckout: (provider: 'stripe' | 'yookassa' | 'stars') =>
    track('begin_checkout', { payment_provider: provider }),

  purchase: (provider: 'stripe' | 'yookassa' | 'stars') =>
    track('purchase', { payment_provider: provider }),

  extraDevicePurchased: (provider: 'stripe' | 'yookassa' | 'stars') =>
    track('extra_device_purchased', { payment_provider: provider }),
};
