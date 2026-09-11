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
import { PlanPricing } from '@workspace/types';
import { SyntheticEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import Logo from '../../assets/Logo.svg?react';
import { FeaturesCard, Link } from '../../components';
import { useTermsStore } from '../../stores';
import { Block, Container, Grid, GridItem } from '../../ui';
import { formatPlanPrice } from '../../utils';
import { TermsDialog } from '../profile/payment/components/TermsDialog';
import { planPeriodLabel } from './planSlug';

interface GetSubscriptionComponentProps {
  isAuthenticated: boolean;
  email: string;
  emailError: string;
  checkoutError: string | null;
  isPending: boolean;
  isRu: boolean;
  selectedPeriod: number | null;
  pricing: PlanPricing | undefined;
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
      <h2 className='text-lg font-bold sm:text-xl'>{title}</h2>
    </div>
  );
}

export const GetSubscriptionComponent = (props: GetSubscriptionComponentProps) => {
  const {
    isAuthenticated,
    email,
    emailError,
    pricing,
    selectedPeriod,
    checkoutError,
    isPending,
    isRu,
    handleEmailChange,
    handleSubmit,
  } = props;

  const { t } = useTranslation();
  const { open: openTerms } = useTermsStore();

  return (
    <>
      <Container maxWidth='lg' className='pt-8 pb-44 sm:pb-28'>
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
                          variant='secondary'
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
                              <p className='text-sm wrap-break-word [word-break:normal]'>
                                {t('getSubscription.email_hint')}
                              </p>
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
                      isDisabled={!pricing}
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

                    <div className='flex items-center gap-3 text-muted'>
                      <IconBrandVisa size={28} stroke={2} />
                      <IconBrandAppleFilled size={22} stroke={2} />
                      <IconCreditCard size={24} stroke={2} />
                      <IconBrandMastercard size={24} stroke={2} />
                      <IconBrandGoogle size={24} stroke={2} />
                    </div>
                  </div>

                  {checkoutError && <p className='text-sm text-danger'>{checkoutError}</p>}
                </div>
              </Block>
            </Form>
          </GridItem>

          <GridItem size={{ base: 12, sm: 12, md: 12, lg: 6 }}>
            <div className='flex flex-col gap-6'>
              <Block className='p-5 sm:p-6'>
                <div className='flex flex-col gap-5'>
                  <h2 className='text-lg font-bold sm:text-xl'>
                    {t('getSubscription.order_title')}
                  </h2>

                  {pricing && selectedPeriod !== null ? (
                    <div className='flex flex-col gap-2'>
                      <div className='flex items-start justify-between gap-4'>
                        <div className='flex items-center gap-3'>
                          <Logo aria-hidden className='size-8 shrink-0 rounded-lg' />
                          <p className='text-base font-semibold'>
                            {t('getSubscription.order_item', {
                              period: planPeriodLabel(selectedPeriod, t),
                            })}
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
                          <Chip.Label>
                            {t('getSubscription.discount', {
                              percent: pricing.discountPercent,
                            })}
                          </Chip.Label>
                        </Chip>
                      )}
                    </div>
                  ) : (
                    <div className='flex flex-col gap-2'>
                      <p className='text-base font-semibold'>
                        {t('getSubscription.plan_unavailable_title')}
                      </p>
                      <p className='text-sm text-muted'>
                        <Trans
                          i18nKey='getSubscription.plan_unavailable_description'
                          components={{ 1: <Link className='underline' href='/#pricing' /> }}
                        />
                      </p>
                    </div>
                  )}
                  <FeaturesCard
                    className='p-5 sm:p-6'
                    title={t('getSubscription.features_title')}
                  />
                </div>
              </Block>

              <div className='flex items-center px-1'>
                <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
                  <IconRestore stroke={2} />
                </span>
                <p className='text-sm font-medium'>{t('getSubscription.guarantee')}</p>
              </div>
            </div>
          </GridItem>
        </Grid>
      </Container>

      <TermsDialog />
    </>
  );
};
