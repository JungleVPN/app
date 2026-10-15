import { useWhop } from '@whop/elements-react';
import { useEffect, useRef, useState } from 'react';
import {
  availableWallets,
  OFFERED_WALLETS,
  toMinorUnits,
  type Wallet,
  type WalletSheet,
} from '../utils/whopWallets';
import type { WhopCheckoutState } from '../whopCheckoutState';

/**
 * The wallet sheet for a checkout and the wallets this browser can pay with.
 * Nothing is offered until `enabled`, or while the total the payer was shown
 * is unknown. `isReady` turns true once it is known which wallets are offered —
 * including none. A new total, such as a promo code's, reprices the sheet in
 * place; only a new account, currency or renewal creates and probes another.
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
  const minorAmount = amount && currency ? toMinorUnits({ amount, currency }) : null;
  const hasTotal = minorAmount !== null;
  // Read when the sheet is created, so a new total alone does not create another.
  const latestAmount = useRef(minorAmount);
  latestAmount.current = minorAmount;

  useEffect(() => {
    if (!whop || !enabled) return;
    const amountNow = latestAmount.current;
    if (!hasTotal || amountNow === null || !currency) {
      setSheet(null);
      setWallets([]);
      setIsReady(true);
      return;
    }
    let isCurrent = true;
    const request = whop.payments.paymentRequest.create({
      accountId,
      amount: amountNow,
      currency,
      requestPayerEmail: false,
      // Whop refuses a renewing plan's token unless it is minted for off-session reuse.
      ...(renews ? { setupFutureUsage: 'off_session' as const } : {}),
    });
    request
      .canMakePayment({ types: [...OFFERED_WALLETS] })
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
  }, [whop, enabled, accountId, currency, renews, hasTotal]);

  useEffect(() => {
    if (sheet && minorAmount !== null) sheet.update({ amount: minorAmount });
  }, [sheet, minorAmount]);

  return { sheet, wallets, isReady };
}
