import { useWhop } from '@whop/elements-react';
import { useEffect, useState } from 'react';
import {
  availableWallets,
  toMinorUnits,
  type Wallet,
  type WalletSheet,
} from '../utils/whopWallets';
import type { WhopCheckoutState } from '../whopCheckoutState';

/**
 * The wallet sheet for a checkout and the wallets this browser can pay with.
 * Nothing is offered until `enabled`, or when the total the payer was shown is
 * unknown. `isReady` turns true once it is known which wallets are offered —
 * including none.
 */
export function useWhopWalletSheet({
  checkout,
  enabled = true,
}: {
  checkout: WhopCheckoutState;
  enabled?: boolean;
}): { sheet: WalletSheet | null; wallets: Wallet[]; isReady: boolean } {
  const whop = useWhop();
  const [sheet, setSheet] = useState<WalletSheet | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  // Sticky: once the wallets are known, repricing the order must not blank them again.
  const [isReady, setIsReady] = useState(false);
  const { accountId, charge, renews } = checkout;
  const amount = charge?.amount;
  const currency = charge?.currency;

  useEffect(() => {
    if (!whop || !enabled) return;
    if (!amount || !currency) {
      setIsReady(true);
      return;
    }
    let isCurrent = true;
    const request = whop.payments.paymentRequest.create({
      accountId,
      amount: toMinorUnits({ amount, currency }),
      currency,
      requestPayerEmail: false,
      // Whop refuses a renewing plan's token unless it is minted for off-session reuse.
      ...(renews ? { setupFutureUsage: 'off_session' as const } : {}),
    });
    request
      .canMakePayment()
      .then((availability) => {
        if (!isCurrent) return;
        setSheet(request);
        setWallets(availableWallets(availability));
        setIsReady(true);
      })
      .catch(() => {
        if (isCurrent) setIsReady(true);
      });
    return () => {
      isCurrent = false;
    };
  }, [whop, enabled, accountId, amount, currency, renews]);

  return { sheet, wallets, isReady };
}
