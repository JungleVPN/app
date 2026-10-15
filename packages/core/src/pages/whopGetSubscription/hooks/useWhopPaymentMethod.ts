import type { SubscriptionPlanDto } from '@workspace/types';
import { useRef, useState } from 'react';
import type { WhopPay } from '../../whopCheckout/hooks/useWhopPay';
import { useWhopWalletSheet } from '../../whopCheckout/hooks/useWhopWalletSheet';
import { getWhopAccountId } from '../../whopCheckout/utils/whopEnv';
import { showWalletSheet, type Wallet } from '../../whopCheckout/utils/whopWallets';
import type { WhopCheckoutState } from '../../whopCheckout/whopCheckoutState';
import type { PaymentMethod } from '../components/WhopPaymentTabs';
import { earlyCheckout } from '../utils/earlyCheckout';
import type { PreparedCheckout } from './usePreparedCheckout';

interface UseWhopPaymentMethodOptions {
  checkout: WhopCheckoutState;
  prepared: PreparedCheckout | null;
  plan: SubscriptionPlanDto | undefined;
  payment: WhopPay;
}

/** The payer's choice when this browser offers it; otherwise its first wallet, or the card. */
function availableMethod(chosen: PaymentMethod | null, wallets: Wallet[]): PaymentMethod {
  if (chosen && (chosen === 'card' || wallets.includes(chosen))) return chosen;
  return wallets[0] ?? 'card';
}

/**
 * The payment method the submit button pays with, and whether it can yet. A
 * wallet pays through its sheet, opened straight from the tap as the browser
 * requires; the card pays through Whop's card inputs, which hand their submit
 * over through `submitCard` and report through `onCardPayableChange`.
 */
export function useWhopPaymentMethod({
  checkout,
  prepared,
  plan,
  payment,
}: UseWhopPaymentMethodOptions) {
  const [chosenMethod, setChosenMethod] = useState<PaymentMethod | null>('apple_pay');
  const [isCardPayable, setIsCardPayable] = useState(false);
  const submitCard = useRef<() => void>(() => {});
  const early = earlyCheckout({
    checkout,
    prepared,
    plan,
    configuredAccountId: getWhopAccountId(),
  });
  const { sheet, wallets, isReady } = useWhopWalletSheet({
    checkout: early.checkout,
    enabled: early.canProbeWallets,
  });
  const method = availableMethod(chosenMethod, wallets);

  const submit = () => {
    if (!prepared) return;
    if (method === 'card') {
      submitCard.current();
      return;
    }
    if (!sheet) return;
    void payment.pay({
      method,
      tokenise: () => showWalletSheet(sheet, method, prepared.request.email),
    });
  };

  return {
    method,
    wallets,
    isLoaded: prepared !== null && isReady,
    /** The methods can be shown — loading behind the email step or the spinner — once the wallets are known and the card form can mount. */
    canShowMethods: isReady && early.canMountCard,
    /** What the card form loads against: the accepted checkout, or the page's early guess at it. */
    cardCheckout: early.checkout,
    canPay: prepared !== null && (method === 'card' ? isCardPayable : sheet !== null),
    select: setChosenMethod,
    submit,
    submitCard,
    onCardPayableChange: setIsCardPayable,
  };
}
