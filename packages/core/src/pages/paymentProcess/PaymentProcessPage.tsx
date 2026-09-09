import {
  Button,
  Chip,
  Description,
  FieldError,
  Form,
  Input,
  TextField,
  Tooltip,
} from '@heroui/react';
import {
  IconBrandAppleFilled,
  IconBrandGoogle,
  IconBrandMastercard,
  IconBrandVisa,
  IconChevronRight,
  IconCreditCard,
  IconHelpCircle,
  IconMail,
  IconRestore,
} from '@tabler/icons-react';
import type { PaymentMethod } from '@workspace/types';
import { type SyntheticEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import Logo from '../../assets/Logo.svg?react';
import { FeaturesCard, Link, Loading } from '../../components';
import { useNavigation, usePlans } from '../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../runtime';
import { usePlanByMonths, usePlansStatus, useTermsStore } from '../../stores';
import { Block, Container, Grid, GridItem } from '../../ui';
import {
  formatPlanPrice,
  getReferralUserId,
  isGlobalOrigin,
  phCapture,
  validateEmail,
} from '../../utils';
import { TermsDialog } from '../profile/payment/components/TermsDialog';
import { PaymentFooter } from './PaymentFooter';
import { monthsFromSlug, planPeriodLabel } from './planSlug';

const BRAND_GRADIENT = 'bg-linear-to-r from-violet-500 to-amber-400';

const EMPTY_EMAIL_ERROR = 'Please enter your email address';
const INVALID_EMAIL_ERROR = 'Please enter a valid email address';

const CHECKOUT_ERROR = 'We could not start the payment. Please try again.';

const EMAIL_HINT =
  "If you've used JungleVPN before, we'll add the subscription to your existing account. " +
  "If not, we'll create a new account with this email.";

function StepHeading({ step, title }: { step: number; title: string }) {
  return (
    <div className='flex items-center gap-3'>
      <span className='flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-sm font-semibold'>
        {step}
      </span>
      <h2 className='text-lg font-bold sm:text-xl'>{title}</h2>
    </div>
  );
}

export default function PaymentProcessPage() {
  const { planSlug } = useParams();
  const { open: openTerms } = useTermsStore();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  // Only Stripe is offered on the global checkout today; the state keeps the
  // submit button tied to the selected method rather than to the card block.
  const [selectedMethod] = useState<PaymentMethod>('stripe');
  const [isPending, setIsPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const paymentsApi = usePaymentsApi();
  const navigate = useNavigation();
  const { profileSubscriptionPath } = useAppRoutes();

  // Starts the one-time fetch if the visitor deep-linked here without passing
  // through the landing page; otherwise the store already holds the plans.
  usePlans();
  const months = monthsFromSlug(planSlug);
  const status = usePlansStatus();
  const plan = usePlanByMonths(months);

  const isRu = !isGlobalOrigin();
  const pricing = isRu ? plan?.rub : plan?.eur;

  // This page sells in EUR through Stripe and is only ever linked from the global
  // landing page — RU checks out through the in-profile plan picker. A RU visitor
  // can still arrive by deep link, so send them where they can actually pay.
  // Replaced in history: there is nothing here for them to go back to.
  useEffect(() => {
    if (isRu) navigate(profileSubscriptionPath, { replace: true });
  }, [isRu, navigate, profileSubscriptionPath]);
  /**
   * Anonymous Stripe checkout for `/payment/planN`.
   *
   * The visitor has no account, so the backend find-or-creates one from the payer
   * email and returns the same Stripe session an authenticated caller would get —
   * see the public-create-session endpoint in apps/payments. Stripe returns the
   * buyer to `/profile/subscription`, which sends them through login first.
   */
  const startCheckout = async (payerEmail: string) => {
    if (months === null) return;

    setIsPending(true);
    setCheckoutError(null);
    try {
      const session = await paymentsApi.createPublicStripeSession({
        email: payerEmail,
        selectedPeriod: months,
        toltReferralId: window.tolt_referral ?? null,
        inviterId: getReferralUserId() ?? undefined,
      });

      if (!session?.url) {
        setCheckoutError(CHECKOUT_ERROR);
        return;
      }

      phCapture('checkout_started', { payment_provider: 'stripe', months });
      window.location.href = session.url;
    } catch {
      setCheckoutError(CHECKOUT_ERROR);
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

    if (!email.trim()) {
      setEmailError(EMPTY_EMAIL_ERROR);
      return;
    }
    if (!validateEmail(email)) {
      setEmailError(INVALID_EMAIL_ERROR);
      return;
    }

    await startCheckout(email.trim());
  };

  if (isRu || status === 'idle' || status === 'loading') return <Loading />;

  return (
    <>
      <Container maxWidth='lg' className='pt-8 pb-44 sm:pb-28'>
        <Grid className='gap-6'>
          {/* Checkout steps — full width up to md, half the grid from lg. */}
          <GridItem size={{ base: 12, sm: 12, md: 12, lg: 6 }}>
            <Form
              className='flex w-full flex-col gap-6'
              validationBehavior='aria'
              onSubmit={handleSubmit}
            >
              <Block className='p-5 sm:p-6'>
                <div className='flex flex-col gap-6'>
                  <StepHeading step={1} title='Enter the email for your JungleVPN account' />

                  <TextField
                    isInvalid={emailError.length > 0}
                    isRequired
                    name='email'
                    id='payment-email'
                    type='email'
                  >
                    <div className='relative w-full'>
                      <span className='pointer-events-none absolute start-4 top-1/2 z-10 flex -translate-y-1/2 items-center text-muted'>
                        <IconMail size={20} stroke={1.5} />
                      </span>
                      <Input
                        autoComplete='email'
                        className='w-full rounded-full ps-11 data-[invalid]:border data-[invalid]:border-danger'
                        placeholder='mail@example.com'
                        value={email}
                        variant='secondary'
                        onChange={(event) => handleEmailChange(event.target.value)}
                      />
                    </div>
                    {/* The error takes the hint's place, and typing restores the hint. */}
                    {emailError.length > 0 ? (
                      <FieldError className='ms-4'>{emailError}</FieldError>
                    ) : (
                      <div className='flex items-center ms-4'>
                        <Description>Needed to manage your subscription</Description>
                        <Tooltip delay={0} closeDelay={0}>
                          <Button
                            aria-label='Why we need your email'
                            isIconOnly
                            size='sm'
                            variant='tertiary'
                            className='size-5 min-w-0 bg-transparent p-0 text-muted'
                          >
                            <IconHelpCircle size={16} stroke={2} />
                          </Button>
                          <Tooltip.Content placement='bottom' showArrow className='max-w-72'>
                            <Tooltip.Arrow />
                            <p className='text-sm wrap-break-word [word-break:normal]'>
                              {EMAIL_HINT}
                            </p>
                          </Tooltip.Content>
                        </Tooltip>
                      </div>
                    )}
                  </TextField>
                </div>
              </Block>

              <Block
                className='p-5 sm:p-6'
                description={
                  <button
                    className='flex w-fit cursor-pointer items-center gap-1 text-sm text-muted underline underline-offset-2'
                    type='button'
                    onClick={openTerms}
                  >
                    Subscription terms
                    <IconChevronRight size={16} stroke={2} className='rtl:-scale-x-100' />
                  </button>
                }
              >
                <div className='flex flex-col gap-6'>
                  <StepHeading step={2} title='Select a payment method' />

                  <div className='rounded-2xl bg-foreground/[0.04] p-4 sm:p-5'>
                    <div className='flex flex-wrap items-center justify-between gap-3 pb-4'>
                      <p className='text-base font-semibold'>Credit or debit card</p>
                      <div className='flex items-center gap-2 text-muted'>
                        <IconBrandVisa size={28} stroke={2} />
                        <IconBrandAppleFilled size={22} stroke={2} />
                        <IconCreditCard size={24} stroke={2} />
                        <IconBrandMastercard size={24} stroke={2} />
                        <IconBrandGoogle size={24} stroke={2} />
                      </div>
                    </div>

                    {selectedMethod === 'stripe' && (
                      <Button
                        className={`${BRAND_GRADIENT} mt-5 w-full rounded-full sm:w-auto sm:px-10`}
                        isDisabled={!pricing}
                        isPending={isPending}
                        type='submit'
                      >
                        Proceed to payment
                      </Button>
                    )}

                    {checkoutError && <p className='mt-3 text-sm text-danger'>{checkoutError}</p>}
                  </div>
                </div>
              </Block>
            </Form>
          </GridItem>

          {/* Order summary */}
          <GridItem size={{ base: 12, sm: 12, md: 12, lg: 6 }}>
            <div className='flex flex-col gap-6'>
              <Block className='p-5 sm:p-6'>
                <div className='flex flex-col gap-5'>
                  <h2 className='text-lg font-bold sm:text-xl'>Your order</h2>

                  {pricing && months !== null ? (
                    <div className='flex flex-col gap-2'>
                      <div className='flex items-start justify-between gap-4'>
                        <div className='flex items-center gap-3'>
                          <Logo aria-hidden className='size-8 shrink-0 rounded-lg' />
                          <p className='text-base font-semibold'>
                            JungleVPN for {planPeriodLabel(months)}
                          </p>
                        </div>
                        <div className='flex shrink-0 items-baseline gap-2'>
                          {pricing.discountPercent > 0 && pricing.fullTotal && (
                            <span className='text-sm text-muted line-through'>
                              {formatPlanPrice(pricing.fullTotal, isRu)}
                            </span>
                          )}
                          <span className='text-base font-semibold'>
                            {formatPlanPrice(pricing.total, isRu)}
                          </span>
                        </div>
                      </div>

                      {pricing.discountPercent > 0 && (
                        <Chip
                          size='sm'
                          className={`w-fit border-none text-[white] ${BRAND_GRADIENT}`}
                        >
                          <Chip.Label>Discount {pricing.discountPercent}%</Chip.Label>
                        </Chip>
                      )}
                    </div>
                  ) : (
                    <div className='flex flex-col gap-2'>
                      <p className='text-base font-semibold'>This plan isn't available</p>
                      <p className='text-sm text-muted'>
                        Pick a subscription length on the{' '}
                        <Link className='underline' href='/#pricing'>
                          pricing page
                        </Link>
                        .
                      </p>
                    </div>
                  )}
                  <FeaturesCard className='p-5 sm:p-6' title='Included in the subscription' />
                </div>
              </Block>

              <div className='flex items-center px-1'>
                <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
                  <IconRestore stroke={2} />
                </span>
                <p className='text-sm font-medium'>30-day money-back guarantee</p>
              </div>
            </div>
          </GridItem>
        </Grid>
      </Container>

      <PaymentFooter />

      <TermsDialog />
    </>
  );
}
