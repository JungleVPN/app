import {
  useHasActiveBilling,
  useIsBillingLoaded,
  usePaddleSubscription,
  useStripeSubscription,
  useYookassaSubscription,
} from '../../../../stores';

/**
 * The user's billing as the payment page needs it.
 *
 * Each provider is asked about itself: a Stripe or Paddle subscriber has no
 * YooKassa saved method, so deriving the provider flags from that list — as
 * this once did — reported them as having no subscription to manage.
 */
export const useSavedPayment = () => {
  const yookassa = useYookassaSubscription();
  const stripe = useStripeSubscription();
  const paddle = usePaddleSubscription();
  const hasActiveMethod = useHasActiveBilling();
  const isLoaded = useIsBillingLoaded();

  return {
    /** YooKassa's saved cards — the only methods this app lists and deletes itself. */
    savedMethods: yookassa.methods,
    isLoading: !isLoaded,
    hasActiveMethod,
    hasStripeSubscription: stripe.active,
    hasPaddleSubscription: paddle.active,
  };
};
