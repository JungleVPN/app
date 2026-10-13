import { Button, Spinner } from '@heroui/react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
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
  /** True while the payment methods are still loading; the whole step shows a spinner. */
  isLoading?: boolean;
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
  isLoading = false,
  handleBack,
  handleSubmit,
}: CheckoutPaymentStepProps) {
  const { t } = useTranslation();
  const { open: openTerms } = useTermsStore();

  if (isLoading) {
    return (
      <Block className='p-5 sm:p-6'>
        <div className='flex min-h-48 items-center justify-center'>
          <Spinner />
        </div>
      </Block>
    );
  }

  return (
    <Block className='p-5 sm:p-6'>
      <div className='flex flex-col gap-6'>
        <StepHeading step={2} title={t('getSubscription.step_payment_title')} />

        {paymentMethodsSlot}

        <Paragraph className='text-sm text-muted'>
          <Trans
            i18nKey='getSubscription.terms_agreement'
            components={{
              1: (
                <button
                  className='cursor-pointer underline underline-offset-2'
                  type='button'
                  onClick={openTerms}
                />
              ),
            }}
          />
        </Paragraph>

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
