import {
  useHasActiveBilling,
  useIsBillingLoaded,
  useWhopSubscription,
  useYookassaSubscription,
} from '../../../../stores';

/**
 * The user's billing as the payment page needs it.
 *
 * Each provider is asked about itself: a Stripe, Paddle or Whop subscriber has no
 * YooKassa saved method, so deriving the provider flags from that list — as
 * this once did — reported them as having no subscription to manage.
 */
export const useSavedPayment = () => {
  const yookassa = useYookassaSubscription();
  const whop = useWhopSubscription();
  const hasActiveMethod = useHasActiveBilling();
  const isLoaded = useIsBillingLoaded();

  return {
    yookassaMethod: yookassa.methods[0],
    whopMethod: whop.methods[0],
    isLoading: !isLoaded,
    hasActiveMethod,
    hasYookassaSubscription: yookassa.active,
    hasWhopSubscription: whop.active,
  };
};
