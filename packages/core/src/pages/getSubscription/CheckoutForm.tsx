import {
  Button,
  Chip,
  Description,
  FieldError,
  Form,
  Input,
  Spinner,
  TextField,
  Tooltip,
} from '@heroui/react';
import { IconChevronRight, IconHelpCircle, IconMail, IconRestore } from '@tabler/icons-react';
import type { SubscriptionPlanDto } from '@workspace/types';
import { type ReactNode, SyntheticEvent, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import Logo from '../../assets/Logo.svg?react';
import { FeaturesCard, Link, PaymentMethodIcons } from '../../components';
import { useTermsStore } from '../../stores';
import { Block, Grid, GridItem, Heading, Paragraph } from '../../ui';
import { formatPlanPrice, scrollToTop } from '../../utils';
import { formatPeriod } from '../../utils/planPricing';
import { TermsDialog } from '../profile/payment/components/TermsDialog';

interface CheckoutFormProps {
  isAuthenticated: boolean;
  email: string;
  emailError: string;
  checkoutError: string | null;
  isPending: boolean;
  selectedPeriod: number | null;
  plan: SubscriptionPlanDto | undefined;
  /** False while the provider still can't start a payment — no plan, or its SDK not loaded yet. */
  canSubmit: boolean;
  /** A provider's promo code entry, shown in the payment step above the submit button. */
  promoCodeSlot?: ReactNode;
  /**
   * An applied promo code's effect on the order, replacing the plan's own
   * discount: `total` is the new amount, absent when the saving can't be
   * priced, and `label` names the saving.
   */
  promoDiscount?: { total?: string; label: string };
  /** Shown under the order when the provider guarantees the price already includes tax. */
  taxNote?: string;
  handleSubmit: (event: SyntheticEvent) => void;
  handleEmailChange: (value: string) => void;
}

const BRAND_GRADIENT = 'bg-linear-to-r from-violet-500 to-amber-400';

function StepHeading({ step, title }: { step: number; title: string }) {
  return (
    <div className='flex items-center gap-3'>
      <span className='flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-sm font-semibold'>
        {step}
      </span>
      <Heading as='h3'>{title}</Heading>
    </div>
  );
}

/**
 * The global checkout page's markup, shared by every payment provider —
 * email step, payment step, and order summary. A provider reaches it only
 * through `canSubmit`; see `useCheckout` for the flow behind it. Taking the
 * payment itself happens after this form, on the provider's own route.
 */
export const CheckoutForm = (props: CheckoutFormProps) => {
  const {
    isAuthenticated,
    email,
    emailError,
    plan,
    canSubmit,
    promoCodeSlot,
    promoDiscount,
    taxNote,
    selectedPeriod,
    checkoutError,
    isPending,
    handleEmailChange,
    handleSubmit,
  } = props;

  const [havePromo, setHavePromo] = useState(false);

  useEffect(() => {
    scrollToTop();
  }, []);

  const { t } = useTranslation();
  const { open: openTerms } = useTermsStore();

  const togglePromoCode = () => {
    setHavePromo(true);
  };

  // Already resolved to this visitor's own currency by the backend — this
  // form only formats it, and never learns which provider quoted it.
  const pricing = plan?.planPricing ?? null;
  const format = (amount: string) => (pricing ? formatPlanPrice(pricing, amount) : amount);

  // An applied promo code replaces the plan's own discount: the plan price is
  // what gets crossed out, and the promo's saving is the one chip shown.
  const planCrossedOut =
    pricing && pricing.discountPercent > 0 && !plan?.isTrial ? pricing.fullTotal : null;
  const crossedOutPrice = promoDiscount ? promoDiscount.total && pricing?.total : planCrossedOut;
  const planDiscountLabel =
    pricing && pricing.discountPercent > 0
      ? t('getSubscription.discount', { percent: pricing.discountPercent })
      : null;
  const discountLabel = promoDiscount ? promoDiscount.label : planDiscountLabel;

  return (
    <>
      <Grid className='gap-6'>
        <GridItem size={{ base: 12, sm: 12, md: 12, lg: 6 }}>
          <Form
            className='flex w-full flex-col gap-6'
            validationBehavior='aria'
            onSubmit={handleSubmit}
          >
            {!isAuthenticated && (
              <Block className='p-5 sm:p-6'>
                <div className='flex flex-col gap-6'>
                  <StepHeading step={1} title={t('getSubscription.step_email_title')} />

                  <TextField
                    isInvalid={emailError.length > 0}
                    isRequired
                    name='email'
                    id='payment-email'
                    type='email'
                  >
                    <div className='relative w-full'>
                      <span className='pointer-events-none absolute inset-s-4 top-1/2 z-10 flex -translate-y-1/2 items-center text-muted'>
                        <IconMail size={20} stroke={1.5} />
                      </span>
                      <Input
                        autoComplete='email'
                        className='w-full rounded-full ps-11 data-invalid:border data-invalid:border-danger'
                        placeholder={t('getSubscription.email_placeholder')}
                        value={email}
                        variant='primary'
                        onChange={(event) => handleEmailChange(event.target.value)}
                      />
                    </div>
                    {emailError.length > 0 ? (
                      <FieldError className='ms-4'>{emailError}</FieldError>
                    ) : (
                      <div className='flex items-center ms-4'>
                        <Description>{t('getSubscription.email_description')}</Description>
                        <Tooltip delay={0} closeDelay={0}>
                          <Button
                            aria-label={t('getSubscription.email_hint_label')}
                            isIconOnly
                            size='sm'
                            variant='tertiary'
                            className='size-5 min-w-0 bg-transparent p-0 text-muted'
                          >
                            <IconHelpCircle size={16} stroke={2} />
                          </Button>
                          <Tooltip.Content placement='bottom' showArrow className='max-w-72'>
                            <Tooltip.Arrow />
                            <Paragraph>{t('getSubscription.email_hint')}</Paragraph>
                          </Tooltip.Content>
                        </Tooltip>
                      </div>
                    )}
                  </TextField>
                </div>
              </Block>
            )}

            <Block
              className='p-5 sm:p-6'
              description={
                <button
                  className='flex w-fit cursor-pointer items-center gap-1 text-sm text-muted underline underline-offset-2'
                  type='button'
                  onClick={openTerms}
                >
                  {t('getSubscription.terms_link')}
                  <IconChevronRight size={16} stroke={2} className='rtl:-scale-x-100' />
                </button>
              }
            >
              <div className='flex flex-col gap-6'>
                <StepHeading step={2} title={t('getSubscription.card_method')} />

                <div className='flex flex-wrap items-center justify-between gap-4'>
                  <Button
                    className={`${BRAND_GRADIENT} w-full rounded-full sm:w-auto sm:px-10`}
                    isDisabled={!canSubmit}
                    isPending={isPending}
                    type='submit'
                  >
                    {({ isPending: isSubmitPending }) => (
                      <>
                        {t('getSubscription.submit')}
                        {isSubmitPending ? <Spinner color='current' size='sm' /> : null}
                      </>
                    )}
                  </Button>

                  <PaymentMethodIcons className='gap-3' />
                </div>

                {checkoutError && <Paragraph>{checkoutError}</Paragraph>}
              </div>
            </Block>
          </Form>
        </GridItem>

        <GridItem size={{ base: 12, sm: 12, md: 12, lg: 6 }}>
          <div className='flex flex-col gap-6'>
            <Block
              className='p-5 sm:p-6'
              description={
                <div className='flex items-center px-1'>
                  <span className='flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
                    <IconRestore stroke={2} />
                  </span>
                  <Paragraph>{t('getSubscription.guarantee')}</Paragraph>
                </div>
              }
            >
              <div className='flex flex-col gap-5'>
                <Heading as='h3'>{t('getSubscription.order_title')}</Heading>

                {pricing && selectedPeriod !== null ? (
                  <div className='flex flex-col gap-2'>
                    <div className='flex items-start justify-between gap-4'>
                      <div className='flex items-center gap-3'>
                        <Logo aria-hidden className='size-8 shrink-0 rounded-lg' />
                        <Paragraph>
                          {t('getSubscription.order_item', {
                            period: formatPeriod(selectedPeriod, t),
                          })}
                        </Paragraph>
                      </div>
                      <div className='flex shrink-0 items-baseline gap-2'>
                        {crossedOutPrice && (
                          <span className='text-sm text-muted line-through'>
                            {format(crossedOutPrice)}
                          </span>
                        )}
                        <span className='text-base font-semibold'>
                          {format(promoDiscount?.total ?? pricing.total)}
                        </span>
                      </div>
                    </div>

                    {discountLabel && (
                      <Chip
                        size='sm'
                        className={`w-fit border-none text-[white] ${BRAND_GRADIENT}`}
                      >
                        <Chip.Label>{discountLabel}</Chip.Label>
                      </Chip>
                    )}

                    {taxNote && <Paragraph className='text-muted'>{taxNote}</Paragraph>}

                    {havePromo ? (
                      promoCodeSlot
                    ) : (
                      <Paragraph
                        onClick={togglePromoCode}
                        className={'hover:underline cursor-pointer text-sm lg:text-sm'}
                      >
                        Have promo?
                      </Paragraph>
                    )}
                  </div>
                ) : (
                  <div className='flex flex-col gap-2'>
                    <Paragraph>{t('getSubscription.plan_unavailable_title')}</Paragraph>
                    <Paragraph>
                      <Trans
                        i18nKey='getSubscription.plan_unavailable_description'
                        components={{ 1: <Link className='underline' href='/#pricing' /> }}
                      />
                    </Paragraph>
                  </div>
                )}
                <FeaturesCard className='p-5 sm:p-6' title={t('getSubscription.features_title')} />
              </div>
            </Block>
          </div>
        </GridItem>
      </Grid>

      <TermsDialog />
    </>
  );
};
