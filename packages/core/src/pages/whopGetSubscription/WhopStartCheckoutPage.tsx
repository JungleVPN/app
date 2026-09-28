import type { WhopPromoCodeDto } from '@workspace/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loading } from '../../components';
import { useNavigation } from '../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../runtime';
import { formatIntlPrice, getReferralUserId } from '../../utils';
import { ActiveSubscriptionDialog } from '../getSubscription/ActiveSubscriptionDialog';
import { CheckoutForm } from '../getSubscription/CheckoutForm';
import { type CheckoutRequest, useCheckout } from '../getSubscription/useCheckout';
import type { WhopCheckoutState } from '../whopCheckout/whopCheckoutState';
import { promoPrice } from './promoPrice';
import { WhopPromoCode } from './WhopPromoCode';

/** A promo's fixed amount as a price string: whole amounts as they are, others to the cent. */
const amountString = (amount: number): string =>
  Number.isInteger(amount) ? String(amount) : amount.toFixed(2);

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
    const { accountId, planId: whopPlanId } = await paymentsApi.createPublicWhopCheckout(request);

    navigate(paddleCheckoutPath, {
      state: {
        accountId,
        whopPlanId,
        request,
        selectedPeriod,
        ...(promo ? { promo } : {}),
      } satisfies WhopCheckoutState,
    });
  };

  const checkout = useCheckout(startCheckout);

  if (checkout.isLoading) return <Loading />;

  const price = promo && checkout.plan ? promoPrice(checkout.plan.planPricing, promo) : null;
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
