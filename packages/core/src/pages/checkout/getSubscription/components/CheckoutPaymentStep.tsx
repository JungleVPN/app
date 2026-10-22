import { Button, Spinner } from '@heroui/react';
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useTermsStore } from '../../../../stores';
import { Block, Paragraph } from '../../../../ui';
import { BRAND_GRADIENT } from '../utils/brandGradient';

interface CheckoutPaymentStepProps {
  checkoutError: string | null;
  isPending: boolean;
  /** False while the provider still can't start a payment — no plan, or its SDK not loaded yet. */
  canSubmit: boolean;
  /** A provider's payment method choice, shown under the heading. */
  paymentMethodsSlot?: ReactNode;
  /** True while the payment methods are still loading; the step shows a spinner over them. */
  isLoading?: boolean;
  /** Replaces the default submit button, for a method whose button has to be its vendor's own. */
  submitSlot?: ReactNode;
  /** Leaves out the purchase agreement, for a method whose own form already carries the terms. */
  hideAgreement?: boolean;
  handleSubmit: () => void;
}

/** The payment step: the payment methods and the button that starts the checkout. */
export function CheckoutPaymentStep({
  checkoutError,
  isPending,
  canSubmit,
  paymentMethodsSlot,
  isLoading = false,
  submitSlot,
  hideAgreement = false,
  handleSubmit,
}: CheckoutPaymentStepProps) {
  const { t } = useTranslation();
  const { open: openTerms } = useTermsStore();

  return (
    <Block className={isLoading ? 'p-5 sm:p-6' : 'p-4'}>
      {isLoading && (
        <div className='flex min-h-48 items-center justify-center'>
          <Spinner />
        </div>
      )}
      {/* Kept mounted under the spinner, so payment methods that load slowly — a
          provider's hosted frames — keep loading rather than start over. */}
      <div
        className={isLoading ? 'invisible h-0 overflow-hidden' : 'flex flex-col gap-2'}
        inert={isLoading}
      >
        {paymentMethodsSlot}
        {submitSlot ?? (
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
        )}

        {!hideAgreement && (
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
        )}
        {checkoutError && <Paragraph>{checkoutError}</Paragraph>}
      </div>
    </Block>
  );
}
