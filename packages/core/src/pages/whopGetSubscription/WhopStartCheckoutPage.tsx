import type { PlanPricing, WhopPromoCodeDto } from '@workspace/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadError, Loading } from '../../components';
import { loadPlans, useNavigation } from '../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../runtime';
import { formatIntlPrice, getReferralUserId, trackCheckoutStarted } from '../../utils';
import { ActiveSubscriptionDialog } from '../getSubscription/ActiveSubscriptionDialog';
import { CheckoutForm } from '../getSubscription/CheckoutForm';
import { type CheckoutRequest, useCheckout } from '../getSubscription/useCheckout';
import type { WhopCheckoutCharge, WhopCheckoutState } from '../whopCheckout/whopCheckoutState';
import { type PromoPrice, promoPrice } from './promoPrice';
import { WhopPromoCode } from './WhopPromoCode';

/** A promo's fixed amount as a price string: whole amounts as they are, others to the cent. */
const amountString = (amount: number): string =>
  Number.isInteger(amount) ? String(amount) : amount.toFixed(2);

/**
 * The total the order summary shows — the promo total when a code reprices
 * it — or undefined when a fixed amount in another currency leaves it unknown.
 */
function shownCharge(
  pricing: PlanPricing,
  price: PromoPrice | null,
): WhopCheckoutCharge | undefined {
  if (!price) return { amount: pricing.total, currency: pricing.currencyCode };
  return 'total' in price ? { amount: price.total, currency: pricing.currencyCode } : undefined;
}

/**
 * Global checkout through Whop: the email step and the order summary, up to
 * the point a payment can begin (mirrors Paddle's). The backend validates the
 * request; the card form itself is mounted on the one dedicated checkout
 * route. A promo code is checked and settled here, because Whop fixes a
 * checkout's code when the checkout opens.
 */
export default function WhopStartCheckoutPage() {
  const { t } = useTranslation();
  const paymentsApi = usePaymentsApi();
  const navigate = useNavigation();
  const { paddleCheckoutPath } = useAppRoutes();
  const [promo, setPromo] = useState<WhopPromoCodeDto | null>(null);

  const startCheckout = async ({ email, planId, selectedPeriod }: CheckoutRequest) => {
    const request = {
      email,
      planId,
      toltReferralId: window.tolt_referral ?? null,
      inviterId: getReferralUserId() ?? undefined,
    };
    const charge = checkout.plan && shownCharge(checkout.plan.planPricing, price);
    const {
      accountId,
      planId: whopPlanId,
      renews,
    } = await paymentsApi.createPublicWhopCheckout(request);

    trackCheckoutStarted({ paymentProvider: 'whop', days: selectedPeriod });

    navigate(paddleCheckoutPath, {
      state: {
        accountId,
        whopPlanId,
        renews,
        request,
        selectedPeriod,
        ...(promo ? { promo } : {}),
        ...(charge ? { charge } : {}),
      } satisfies WhopCheckoutState,
    });
  };

  const checkout = useCheckout(startCheckout);
  const price = promo && checkout.plan ? promoPrice(checkout.plan.planPricing, promo) : null;

  if (checkout.isLoading) return <Loading />;
  if (checkout.loadFailed) return <LoadError reason='plans' onRetry={loadPlans} />;

  const promoDiscount =
    price &&
    ('total' in price
      ? {
          total: price.total,
          label: t('getSubscription.promo_discount', { percent: price.percentOff }),
        }
      : {
          label: t('getSubscription.promo_discount_amount', {
            amount: formatIntlPrice(amountString(price.amountOff), price.currency),
          }),
        });

  return (
    <>
      <CheckoutForm
        isAuthenticated={checkout.isAuthenticated}
        email={checkout.email}
        emailError={checkout.emailError}
        checkoutError={checkout.checkoutError}
        isPending={checkout.isPending}
        selectedPeriod={checkout.selectedPeriod}
        plan={checkout.plan}
        canSubmit={checkout.plan !== undefined}
        promoCodeSlot={
          checkout.plan && (
            <WhopPromoCode planId={checkout.plan.planId} applied={promo} onApplyChange={setPromo} />
          )
        }
        promoDiscount={promoDiscount ?? undefined}
        taxNote={t('getSubscription.tax_included_note')}
        handleSubmit={checkout.handleSubmit}
        handleEmailChange={checkout.handleEmailChange}
      />
      <ActiveSubscriptionDialog
        email={checkout.activeSubscriptionEmail}
        isLoggedIn={checkout.isAuthenticated}
        onClose={checkout.dismissActiveSubscription}
      />
    </>
  );
}
