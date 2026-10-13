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
  submitRef.current = submit;

  useEffect(() => {
    onCanPayChange(canPay);
    return () => onCanPayChange(false);
  }, [canPay, onCanPayChange]);

  return (
    <>
      {inputs}
      <BrandingElement />
    </>
  );
}

/** The card inputs for the card tab; the page's submit button pays them. */
export function WhopCardPanel({ checkout, returnUrl, ...rest }: WhopCardPanelProps) {
  return (
    <Payments accountId={checkout.accountId} plan={checkout.whopPlanId} returnUrl={returnUrl}>
      <CardInputs checkout={checkout} {...rest} />
    </Payments>
  );
}
