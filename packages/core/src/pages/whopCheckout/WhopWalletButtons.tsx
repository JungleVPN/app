import type { Whop } from '@whop/elements';
import { useWhop, type WalletAvailability } from '@whop/elements-react';
import { useEffect, useState } from 'react';
import { i18n } from '../../core/i18n';
import { Paragraph } from '../../ui';
import { useWhopPay, WalletSheetError } from './useWhopPay';
import { ApplePayButton, GooglePayButton } from './walletButtons';
import type { WhopCheckoutCharge, WhopCheckoutState } from './whopCheckoutState';
import { getWhopEnvironment } from './whopEnv';

type WalletSheet = ReturnType<Whop['payments']['paymentRequest']['create']>;
type Wallet = 'apple_pay' | 'google_pay';

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

/** The wallets the device can pay with, best-native first. */
function availableWallets(availability: WalletAvailability): Wallet[] {
  const isAvailable = (wallet: Wallet) =>
    wallet === 'apple_pay' ? availability.applePay : availability.googlePay;
  return (availability.order ?? ['apple_pay', 'google_pay']).filter(isAvailable);
}

interface WhopWalletButtonsProps {
  checkout: WhopCheckoutState;
  returnUrl: string;
}

/**
 * Apple Pay and Google Pay, opened with the email the payer entered at
 * checkout so the sheet never asks for — or substitutes — its own. Whop's
 * express checkout takes the wallet's email and offers no way to pass ours,
 * so the sheet's token is charged through our backend like the card is.
 * Each wallet shows its vendor's own button, as their terms require.
 * Offers nothing when the total the payer was shown is unknown.
 */
export function WhopWalletButtons({ checkout, returnUrl }: WhopWalletButtonsProps) {
  const whop = useWhop();
  const { pay, error } = useWhopPay({ checkout, returnUrl });
  const [sheet, setSheet] = useState<WalletSheet | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const { accountId, charge } = checkout;
  const amount = charge?.amount;
  const currency = charge?.currency;

  useEffect(() => {
    if (!whop || !amount || !currency) return;
    let isCurrent = true;
    const request = whop.payments.paymentRequest.create({
      accountId,
      amount: toMinorUnits({ amount, currency }),
      currency,
      requestPayerEmail: false,
    });
    request
      .canMakePayment()
      .then((availability) => {
        if (!isCurrent) return;
        setSheet(request);
        setWallets(availableWallets(availability));
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [whop, accountId, amount, currency]);

  if (!sheet || wallets.length === 0) return null;

  const locale = i18n.language;

  const openSheet = (wallet: Wallet) =>
    pay(() =>
      sheet
        .show(wallet, { email: checkout.request.email })
        .then((result) => result.ctok)
        .catch((caught: unknown) => {
          if (caught instanceof Error && caught.message === SHEET_DISMISSED) return null;
          console.error('Whop wallet sheet failed', caught);
          throw new WalletSheetError();
        }),
    );

  return (
    <div className='flex w-full flex-col gap-3 mb-4'>
      <div className='flex flex-col gap-3 sm:flex-row'>
        {wallets.map((wallet) =>
          wallet === 'apple_pay' ? (
            <ApplePayButton key={wallet} locale={locale} onClick={() => openSheet(wallet)} />
          ) : (
            <GooglePayButton
              key={wallet}
              environment={getWhopEnvironment()}
              locale={locale}
              onClick={() => openSheet(wallet)}
            />
          ),
        )}
      </div>
      {error && <Paragraph role='alert'>{error}</Paragraph>}
    </div>
  );
}
