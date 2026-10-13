import { Skeleton } from '@heroui/react';
import { BrandingElement, Payments } from '@whop/elements-react';
import { type RefObject, useEffect } from 'react';
import { useWhopCardFields } from '../whopCheckout/useWhopCardFields';
import type { WhopPay } from '../whopCheckout/useWhopPay';
import type { WhopCheckoutState } from '../whopCheckout/whopCheckoutState';

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

/** A label bone above an input bone, sized to the real field so nothing moves when it loads. */
function FieldBone({ inputHeight }: { inputHeight: 'h-11' | 'h-[38px]' }) {
  return (
    <div className='flex flex-col gap-1'>
      <Skeleton animationType='none' className='h-5 w-24 rounded-lg' />
      <Skeleton animationType='none' className={`${inputHeight} w-full rounded-lg`} />
    </div>
  );
}

/**
 * The card form's shape while Whop's frames load. Every row is as tall as the
 * loaded one (68, 68, 62, 62 and the 44px branding line), so the page below
 * does not jump when the inputs appear.
 */
function CardInputsSkeleton() {
  return (
    <div
      aria-hidden
      data-testid='card-inputs-skeleton'
      className='skeleton--shimmer relative overflow-hidden rounded-lg'
    >
      <div className='flex flex-col gap-4'>
        <FieldBone inputHeight='h-11' />
        <div className='grid grid-cols-2 gap-4'>
          <FieldBone inputHeight='h-11' />
          <FieldBone inputHeight='h-11' />
        </div>
        <FieldBone inputHeight='h-[38px]' />
        <div className='grid grid-cols-2 gap-4'>
          <FieldBone inputHeight='h-[38px]' />
          <FieldBone inputHeight='h-[38px]' />
        </div>
      </div>
      <div className='flex h-11 flex-col items-center justify-center gap-2'>
        <Skeleton animationType='none' className='h-3 w-4/5 rounded-lg' />
        <Skeleton animationType='none' className='h-3 w-2/5 rounded-lg' />
      </div>
    </div>
  );
}

/**
 * The card inputs for the card tab; the page's submit button pays them. Whop
 * keeps every input and the branding element hidden until all of them have
 * loaded, and shows the skeleton meanwhile.
 */
export function WhopCardPanel({ checkout, returnUrl, ...rest }: WhopCardPanelProps) {
  return (
    <Payments
      accountId={checkout.accountId}
      plan={checkout.whopPlanId}
      returnUrl={returnUrl}
      fallback={<CardInputsSkeleton />}
    >
      <CardInputs checkout={checkout} {...rest} />
    </Payments>
  );
}
