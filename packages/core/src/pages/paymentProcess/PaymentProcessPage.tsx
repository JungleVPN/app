import { Button, Chip, Description, Input, TextField, Tooltip } from '@heroui/react';
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
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import Logo from '../../assets/Logo.svg?react';
import LogoDark from '../../assets/Logo_dark.svg?react';
import { FeaturesCard, Link } from '../../components';
import { useTheme } from '../../hooks';
import { useTermsStore } from '../../stores';
import { Block, Container, Grid, GridItem } from '../../ui';
import { TermsDialog } from '../profile/payment/components/TermsDialog';
import { PaymentFooter } from './PaymentFooter';
import { formatEur, resolvePlan } from './planMocks';

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

export default function PaymentProcessPage() {
  const [searchParams] = useSearchParams();
  const { theme } = useTheme();
  const { open: openTerms } = useTermsStore();
  const plan = resolvePlan(searchParams.get('plan'));
  const [email, setEmail] = useState('');

  const BrandLogo = theme === 'dark' ? LogoDark : Logo;

  return (
    <>
      <Container maxWidth='lg' className='py-8'>
        <Grid className='gap-6'>
          {/* Checkout steps — full width up to md, half the grid from lg. */}
          <GridItem size={{ base: 12, sm: 12, md: 12, lg: 6 }}>
            <div className='flex flex-col gap-6'>
              <Block className='p-5 sm:p-6'>
                <div className='flex flex-col gap-6'>
                  <StepHeading step={1} title='Enter the email for your JungleVPN account' />

                  <TextField name='email' id='payment-email' type='email'>
                    <div className='relative w-full'>
                      <span className='pointer-events-none absolute start-4 top-1/2 z-10 flex -translate-y-1/2 items-center text-muted'>
                        <IconMail size={20} stroke={1.5} />
                      </span>
                      <Input
                        autoComplete='email'
                        className='w-full rounded-full ps-11'
                        placeholder='mail@example.com'
                        value={email}
                        variant='secondary'
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </div>
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

                    <div className='h-px w-full bg-foreground/10' />

                    <p className='pt-4 text-sm leading-relaxed text-muted'>
                      By completing your purchase, you agree to our{' '}
                      <Link className='underline' href='/terms'>
                        Terms of Service
                      </Link>
                      ,{' '}
                      <Link className='underline' href='/privacy'>
                        Privacy Policy
                      </Link>
                      . If the subscription includes auto-renewal, automatic charges will occur at
                      the standard price. The promo code can only be applied to the first
                      subscription payment. The subscription owner can manage or cancel it at any
                      time through the{' '}
                      <Link className='underline' href='/profile/subscription'>
                        personal account
                      </Link>
                      .
                    </p>

                    <Button
                      className={`${BRAND_GRADIENT} mt-5 w-full rounded-full sm:w-auto sm:px-10`}
                    >
                      Proceed to payment
                    </Button>
                  </div>
                </div>
              </Block>
            </div>
          </GridItem>

          {/* Order summary */}
          <GridItem size={{ base: 12, sm: 12, md: 12, lg: 6 }}>
            <div className='flex flex-col gap-6'>
              <Block className='p-5 sm:p-6'>
                <div className='flex flex-col gap-5'>
                  <h2 className='text-lg font-bold sm:text-xl'>Your order</h2>

                  <div className='flex flex-col gap-2'>
                    <div className='flex items-start justify-between gap-4'>
                      <div className='flex items-center gap-3'>
                        <BrandLogo aria-hidden className='size-8 shrink-0 rounded-lg' />
                        <p className='text-base font-semibold'>{plan.label}</p>
                      </div>
                      <div className='flex shrink-0 items-baseline gap-2'>
                        {plan.discountPercent > 0 && (
                          <span className='text-sm text-muted line-through'>
                            {formatEur(plan.fullTotal)}
                          </span>
                        )}
                        <span className='text-base font-semibold'>{formatEur(plan.total)}</span>
                      </div>
                    </div>

                    {plan.discountPercent > 0 && (
                      <Chip
                        size='sm'
                        className={`w-fit border-none text-[white] ${BRAND_GRADIENT}`}
                      >
                        <Chip.Label>Discount {plan.discountPercent}%</Chip.Label>
                      </Chip>
                    )}
                  </div>
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
