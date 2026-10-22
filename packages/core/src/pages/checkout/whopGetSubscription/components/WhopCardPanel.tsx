import { Spinner } from '@heroui/react';
import { BrandingElement, Payments } from '@whop/elements-react';
import { type RefObject, useEffect } from 'react';
import { useWhopCardFields } from '../../whopCheckout/hooks/useWhopCardFields';
import type { WhopPay } from '../../whopCheckout/hooks/useWhopPay';
import type { WhopCheckoutState } from '../../whopCheckout/whopCheckoutState';

interface WhopCardPanelProps {
  checkout: WhopCheckoutState;
  payment: WhopPay;
  returnUrl: string;
  /** Receives the call that pays the card, for the page's own submit button. */
  submitRef: RefObject<() => void>;
  onCanPayChange: (canPay: boolean) => void;
}

function CardInputs({
  checkout,
  payment,
  submitRef,
  onCanPayChange,
}: Omit<WhopCardPanelProps, 'returnUrl'>) {
  const { inputs, canPay, submit } = useWhopCardFields({ checkout, payment });

  useEffect(() => {
    submitRef.current = submit;
  });

  useEffect(() => {
    onCanPayChange(canPay);
  }, [canPay, onCanPayChange]);

  useEffect(() => () => onCanPayChange(false), [onCanPayChange]);

  return (
    <>
      {inputs}
      <BrandingElement />
    </>
  );
}

/** The space a label and its input take, sized to the real field so nothing moves when it loads. */
function FieldSpace() {
  return (
    <div className='flex flex-col gap-1'>
      <div className='h-5' />
      <div className='h-11' />
    </div>
  );
}

/**
 * A spinner in the card form's place while Whop's frames load. It holds the
 * form's exact space — every row as tall as the loaded one (four 68px rows and
 * the 59px branding line) — so the page below does not jump when the inputs
 * appear.
 */
function CardInputsLoading() {
  return (
    <div aria-hidden data-testid='card-inputs-loading' className='relative'>
      <div className='invisible'>
        <div className='flex flex-col gap-4'>
          <FieldSpace />
          <div className='grid grid-cols-2 gap-4'>
            <FieldSpace />
            <FieldSpace />
          </div>
          <FieldSpace />
          <div className='grid grid-cols-2 gap-4'>
            <FieldSpace />
            <FieldSpace />
          </div>
        </div>
      </div>
      <div className='h-14.75' />
      <div className='absolute inset-0 flex items-center justify-center'>
        <Spinner />
      </div>
    </div>
  );
}

/**
 * The card inputs for the card tab; the page's submit button pays them. Whop
 * keeps every input and the branding element hidden until all of them have
 * loaded, and shows a spinner in their place meanwhile.
 */
export function WhopCardPanel({ checkout, returnUrl, ...rest }: WhopCardPanelProps) {
  return (
    <Payments
      accountId={checkout.accountId}
      plan={checkout.whopPlanId}
      returnUrl={returnUrl}
      fallback={<CardInputsLoading />}
    >
      <CardInputs checkout={checkout} {...rest} />
    </Payments>
  );
}
