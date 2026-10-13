import type { Whop } from '@whop/elements';
import { useWhop, type WalletAvailability } from '@whop/elements-react';
import { useEffect, useState } from 'react';
import { WalletSheetError } from './useWhopPay';
import type { WhopCheckoutCharge, WhopCheckoutState } from './whopCheckoutState';

export type WalletSheet = ReturnType<Whop['payments']['paymentRequest']['create']>;
export type Wallet = 'apple_pay' | 'google_pay';

/** What `show()` rejects with when the payer dismisses the sheet — the one failure that is no error. */
const SHEET_DISMISSED = 'payment_request_cancelled';

/** `charge.amount` in the currency's minor units: cents for USD, whole yen for JPY. */
function toMinorUnits({ amount, currency }: WhopCheckoutCharge): number {
  const { maximumFractionDigits = 2 } = new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).resolvedOptions();
  return Math.round(Number(amount) * 10 ** maximumFractionDigits);
}

/**
 * The wallets to offer. Apple Pay always comes first when it is available, and
 * otherwise Whop's order, best-native first. Where Apple Pay is the native
 * wallet (Safari, every iOS browser) it is offered alone, as Whop's own
 * express checkout does: Google Pay there is a pay.google.com popup that
 * Safari cuts off from the page, failing with OR_BIBED_15.
 */
export function availableWallets(availability: WalletAvailability): Wallet[] {
  const isAvailable = (wallet: string): wallet is Wallet =>
    (wallet === 'apple_pay' && availability.applePay) ||
    (wallet === 'google_pay' && availability.googlePay);
  const ranked = (availability.order ?? ['apple_pay', 'google_pay']).filter(isAvailable);
  if (availability.order?.[0] === 'apple_pay' && availability.applePay) return ['apple_pay'];
  return [...ranked].sort((a, b) => Number(b === 'apple_pay') - Number(a === 'apple_pay'));
}

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

/**
 * Opens the wallet's sheet with the email the payer entered at checkout and
 * resolves to its token, or null when the payer dismissed it.
 */
export async function showWalletSheet(
  sheet: WalletSheet,
  wallet: Wallet,
  email: string,
): Promise<string | null> {
  try {
    const result = await sheet.show(wallet, { email });
    return result.ctok;
  } catch (caught) {
    if (caught instanceof Error && caught.message === SHEET_DISMISSED) return null;
    console.error('Whop wallet sheet failed', caught);
    throw new WalletSheetError();
  }
}
