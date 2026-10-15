import { useRef, useState } from 'react';
import type { WhopPay } from '../../whopCheckout/useWhopPay';
import type { WhopCheckoutState } from '../../whopCheckout/whopCheckoutState';
import { showWalletSheet, useWhopWalletSheet, type Wallet } from '../../whopCheckout/whopWallets';
import type { PaymentMethod } from '../components/WhopPaymentTabs';
import type { PreparedCheckout } from './usePreparedCheckout';

interface UseWhopPaymentMethodOptions {
  checkout: WhopCheckoutState;
  prepared: PreparedCheckout | null;
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
export function useWhopPaymentMethod({ checkout, prepared, payment }: UseWhopPaymentMethodOptions) {
  const [chosenMethod, setChosenMethod] = useState<PaymentMethod | null>('apple_pay');
  const [isCardPayable, setIsCardPayable] = useState(false);
  const submitCard = useRef<() => void>(() => {});
  const { sheet, wallets, isReady } = useWhopWalletSheet({
    checkout,
    enabled: prepared !== null,
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
    canPay: prepared !== null && (method === 'card' ? isCardPayable : sheet !== null),
    select: setChosenMethod,
    submit,
    submitCard,
    onCardPayableChange: setIsCardPayable,
  };
}
