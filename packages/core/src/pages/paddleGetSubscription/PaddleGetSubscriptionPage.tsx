import { Button, FieldError, Form, Input, Spinner, TextField } from '@heroui/react';
import type { Paddle } from '@paddle/paddle-js';
import { initializePaddle } from '@paddle/paddle-js';
import { type SyntheticEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { Loading } from '../../components';
import { useNavigation, usePlans } from '../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../runtime';
import { useAuthStore, usePlanByMonths, usePlansStatus } from '../../stores';
import { Block, Container } from '../../ui';
import { getReferralUserId, isGlobalOrigin, scrollToTop, validateEmail } from '../../utils';
import { monthsFromSlug } from '../getSubscription/planSlug';
import { isActiveSubscriptionError, isThrottledError } from './checkoutErrors';
import { getPaddleClientToken, getPaddleEnvironment } from './paddleEnv';

const EMPTY_EMAIL_ERROR = 'getSubscription.email_required_error';
const INVALID_EMAIL_ERROR = 'getSubscription.email_invalid_error';
const CHECKOUT_ERROR = 'getSubscription.checkout_error';
const THROTTLED_ERROR = 'getSubscription.throttled_error';

/**
 * Sandbox proof-of-concept for a Paddle-powered pricing page, mirroring
 * GetSubscriptionPage's Stripe flow. Unlike Stripe, Paddle Checkout is an
 * overlay opened client-side against a catalog price id, so this page talks
 * to the backend only to validate the request (period, duplicate
 * subscription, rate limit) — the checkout itself never leaves the browser.
 */
export default function PaddleGetSubscriptionPage() {
  const { planSlug } = useParams();
  const { t } = useTranslation();
  const { authUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [paddle, setPaddle] = useState<Paddle | undefined>();
  const [formattedTotal, setFormattedTotal] = useState<string | null>(null);
  // Detected once from the price preview (no address was sent, so Paddle
  // resolved it from the visitor's IP) and reused to open checkout — passing
  // it alongside the email skips the "your details" page straight to payment.
  const [detectedCountryCode, setDetectedCountryCode] = useState<string | null>(null);
  const paymentsApi = usePaymentsApi();
  const navigate = useNavigation();
  const { profileSubscriptionPath, paymentReturnPath } = useAppRoutes();

  const isRu = !isGlobalOrigin();

  useEffect(() => {
    if (isRu) navigate(profileSubscriptionPath, { replace: true });
  }, [isRu, navigate, profileSubscriptionPath]);

  usePlans();

  const selectedPeriod = monthsFromSlug(planSlug);
  const status = usePlansStatus();
  const plan = usePlanByMonths(selectedPeriod);
  const paddlePriceId = plan?.paddlePriceId ?? null;

  useEffect(() => {
    scrollToTop();
  }, []);

  // Failing loudly here (an unset/invalid env var throws) is deliberate: a
  // misconfigured token or environment must never silently open a checkout
  // against the wrong Paddle account.
  useEffect(() => {
    let cancelled = false;
    initializePaddle({
      token: getPaddleClientToken(),
      environment: getPaddleEnvironment(),
    }).then((instance) => {
      if (!cancelled) setPaddle(instance);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!paddle || !paddlePriceId) return;
    let cancelled = false;

    paddle
      .PricePreview({ items: [{ priceId: paddlePriceId, quantity: 1 }] })
      .then((result) => {
        if (cancelled) return;
        const lineItem = result.data.details.lineItems[0];
        setFormattedTotal(lineItem?.formattedTotals.total ?? null);
        setDetectedCountryCode(result.data.address?.countryCode ?? null);
      })
      .catch(() => {
        if (!cancelled) setFormattedTotal(null);
      });

    return () => {
      cancelled = true;
    };
  }, [paddle, paddlePriceId]);

  const openPaddleCheckout = async (payerEmail: string) => {
    if (selectedPeriod === null || !paddle) return;

    setIsPending(true);
    setCheckoutError(null);
    try {
      const { priceId, customData } = await paymentsApi.createPublicPaddleCheckout({
        email: payerEmail,
        selectedPeriod,
        toltReferralId: window.tolt_referral ?? null,
        inviterId: getReferralUserId() ?? undefined,
      });

      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData,
        customer: {
          email: payerEmail,
          ...(detectedCountryCode && { address: { countryCode: detectedCountryCode } }),
        },
        settings: {
          successUrl: `${window.location.origin}${paymentReturnPath}`,
          allowLogout: false,
          displayMode: 'inline',
        },
      });
    } catch (error) {
      if (isActiveSubscriptionError(error)) {
        navigate(profileSubscriptionPath);
        return;
      }
      setCheckoutError(t(isThrottledError(error) ? THROTTLED_ERROR : CHECKOUT_ERROR));
    } finally {
      setIsPending(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError) setEmailError('');
  };

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault();

    const userEmail = authUser?.email ?? email;

    if (!userEmail.trim()) {
      setEmailError(t(EMPTY_EMAIL_ERROR));
      return;
    }
    if (!validateEmail(userEmail)) {
      setEmailError(t(INVALID_EMAIL_ERROR));
      return;
    }

    await openPaddleCheckout(userEmail);
  };

  if (isRu || status === 'idle' || status === 'loading') return <Loading />;

  const canSubmit = Boolean(paddle) && paddlePriceId !== null;

  return (
    <Container maxWidth='sm' className='pt-8 pb-44 sm:pb-28'>
      <Block className='p-5 sm:p-6'>
        <Form
          className='flex w-full flex-col gap-6'
          validationBehavior='aria'
          onSubmit={handleSubmit}
        >
          {!authUser && (
            <TextField isInvalid={emailError.length > 0} isRequired name='email' type='email'>
              <Input
                autoComplete='email'
                placeholder={t('getSubscription.email_placeholder')}
                value={email}
                onChange={(event) => handleEmailChange(event.target.value)}
              />
              {emailError.length > 0 && <FieldError>{emailError}</FieldError>}
            </TextField>
          )}

          <div className='flex items-center justify-between'>
            <span className='text-base font-semibold'>
              {formattedTotal ??
                (paddlePriceId ? '…' : t('getSubscription.plan_unavailable_title'))}
            </span>

            <Button isDisabled={!canSubmit} isPending={isPending} type='submit'>
              {({ isPending: isSubmitPending }) => (
                <>
                  {t('getSubscription.submit')}
                  {isSubmitPending ? <Spinner color='current' size='sm' /> : null}
                </>
              )}
            </Button>
          </div>

          {checkoutError && <p className='text-sm text-danger'>{checkoutError}</p>}
        </Form>
      </Block>
    </Container>
  );
}
