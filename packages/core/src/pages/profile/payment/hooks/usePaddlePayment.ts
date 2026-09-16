import { useCallback, useState } from 'react';
import { usePaymentsApi } from '../../../../runtime';
import { useAuthStoreInfo } from '../../../../stores';

/**
 * Paddle Customer Portal access for the profile payment page. Unlike Stripe,
 * Paddle checkout only ever happens on the standalone public pricing page —
 * an authenticated user with an active subscription only ever needs the
 * "manage it" link here, so this hook carries no checkout flow.
 */
export function usePaddlePayment() {
  const { rmnUser } = useAuthStoreInfo();
  const paymentsApi = usePaymentsApi();

  const redirectTo = useCallback((url: string) => {
    window.location.href = url;
  }, []);

  const [isOpeningPaddlePortal, setIsOpeningPaddlePortal] = useState(false);

  // Mint a fresh Customer Portal URL on demand (an explicit user action), so
  // we never have to cache a portal session that can expire.
  const handleOpenPaddlePortal = useCallback(async () => {
    const uuid = rmnUser?.id;
    if (!uuid) return;
    setIsOpeningPaddlePortal(true);
    try {
      const status = await paymentsApi.getPaddleSubscription();
      if (status.portalUrl) redirectTo(status.portalUrl);
    } finally {
      setIsOpeningPaddlePortal(false);
    }
  }, [rmnUser?.id, paymentsApi, redirectTo]);

  return {
    handleOpenPaddlePortal,
    isOpeningPaddlePortal,
  };
}
