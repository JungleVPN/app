import { Button, Spinner } from '@heroui/react';
import { IconChevronRight } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useTermsStore } from '../../stores';
import { Block, Heading, Paragraph } from '../../ui';
import { BRAND_GRADIENT } from './brandGradient';

interface CheckoutPaymentStepProps {
  checkoutError: string | null;
  isPending: boolean;
  /** False while the provider still can't start a payment — no plan, or its SDK not loaded yet. */
  canSubmit: boolean;
  /** A provider's payment method choice, shown under the heading. */
  paymentMethodsSlot?: ReactNode;
  /** Returns to the email step; absent when there is none before this step. */
  handleBack?: () => void;
  handleSubmit: () => void;
}

function StepHeading({ step, title }: { step: number; title: string }) {
  return (
    <div className='flex items-center gap-3'>
      <span className='flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-sm font-semibold'>
        {step}
      </span>
      <Heading as='h3' className={'text-md'}>
        {title}
      </Heading>
    </div>
  );
}

/** The payment step: the payment methods and the button that starts the checkout. */
export function CheckoutPaymentStep({
  checkoutError,
  isPending,
  canSubmit,
  paymentMethodsSlot,
  handleBack,
  handleSubmit,
}: CheckoutPaymentStepProps) {
  const { t } = useTranslation();
  const { open: openTerms } = useTermsStore();

  return (
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
        <StepHeading step={2} title={t('getSubscription.step_payment_title')} />

        {paymentMethodsSlot}

        <div className='flex flex-wrap items-center justify-between gap-4'>
          <Button
            className={`${BRAND_GRADIENT} w-full rounded-full`}
            isDisabled={!canSubmit}
            isPending={isPending}
            onPress={handleSubmit}
          >
            {({ isPending: isSubmitPending }) => (
              <>
                {t('getSubscription.submit')}
                {isSubmitPending ? <Spinner color='current' size='sm' /> : null}
              </>
            )}
          </Button>
        </div>

        {checkoutError && <Paragraph>{checkoutError}</Paragraph>}

        {handleBack && (
          <Button className='w-fit rounded-full' variant='secondary' onPress={handleBack}>
            {t('common.back')}
          </Button>
        )}
      </div>
    </Block>
  );
}
