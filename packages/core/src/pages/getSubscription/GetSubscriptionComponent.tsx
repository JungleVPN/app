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
import { PlanPricing } from '@workspace/types';
import { SyntheticEvent } from 'react';
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
                    <StepHeading step={1} title='Enter the email for your JungleVPN account' />

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
                          placeholder='mail@example.com'
                          value={email}
                          variant='secondary'
                          onChange={(event) => handleEmailChange(event.target.value)}
                        />
                      </div>
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
              )}

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

                    <Button
                      className={`${BRAND_GRADIENT} mt-5 w-full rounded-full sm:w-auto sm:px-10`}
                      isDisabled={!pricing}
                      isPending={isPending}
                      type='submit'
                    >
                      Proceed to payment
                    </Button>

                    {checkoutError && <p className='mt-3 text-sm text-danger'>{checkoutError}</p>}
                  </div>
                </div>
              </Block>
            </Form>
          </GridItem>

          <GridItem size={{ base: 12, sm: 12, md: 12, lg: 6 }}>
            <div className='flex flex-col gap-6'>
              <Block className='p-5 sm:p-6'>
                <div className='flex flex-col gap-5'>
                  <h2 className='text-lg font-bold sm:text-xl'>Your order</h2>

                  {pricing && selectedPeriod !== null ? (
                    <div className='flex flex-col gap-2'>
                      <div className='flex items-start justify-between gap-4'>
                        <div className='flex items-center gap-3'>
                          <Logo aria-hidden className='size-8 shrink-0 rounded-lg' />
                          <p className='text-base font-semibold'>
                            JungleVPN for {planPeriodLabel(selectedPeriod)}
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

      <TermsDialog />
    </>
  );
};
