import type { Whop } from '@whop/elements';
import { useWhop, type WalletAvailability } from '@whop/elements-react';
import { useEffect, useState } from 'react';
import { i18n } from '../../core/i18n';
import { Paragraph } from '../../ui';
import { failureFor, WalletSheetError, type WhopPay } from './useWhopPay';
import { WhopPaymentProcessingDrawer } from './WhopPaymentProcessingDrawer';
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

/**
 * The wallets to offer, best-native first. Where Apple Pay is the native
 * wallet (Safari, every iOS browser) it is offered alone, as Whop's own
 * express checkout does: Google Pay there is a pay.google.com popup that
 * Safari cuts off from the page, failing with OR_BIBED_15.
 */
function availableWallets(availability: WalletAvailability): Wallet[] {
  const isAvailable = (wallet: string): wallet is Wallet =>
    (wallet === 'apple_pay' && availability.applePay) ||
    (wallet === 'google_pay' && availability.googlePay);
  const ranked = (availability.order ?? ['apple_pay', 'google_pay']).filter(isAvailable);
  return availability.order?.[0] === 'apple_pay' && availability.applePay ? ['apple_pay'] : ranked;
}

interface WhopWalletButtonsProps {
  checkout: WhopCheckoutState;
  payment: WhopPay;
}

/**
 * Apple Pay and Google Pay, opened with the email the payer entered at
 * checkout so the sheet never asks for — or substitutes — its own. Whop's
 * express checkout takes the wallet's email and offers no way to pass ours,
 * so the sheet's token is charged through our backend like the card is.
 * Each wallet shows its vendor's own button, as their terms require.
 * Offers nothing when the total the payer was shown is unknown.
 *
 * Charging and waiting for our webhook can take a while after the sheet
 * closes, so meanwhile a drawer says the payment is processing and no
 * payment, by wallet or card, can start until this one settles.
 */
export function WhopWalletButtons({ checkout, payment }: WhopWalletButtonsProps) {
  const whop = useWhop();
  const { pay, pendingVia, isCharging } = payment;
  const error = failureFor(payment, 'wallet');
  const [sheet, setSheet] = useState<WalletSheet | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const { accountId, charge, renews } = checkout;
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
      // Whop refuses a renewing plan's token unless it is minted for off-session reuse.
      ...(renews ? { setupFutureUsage: 'off_session' as const } : {}),
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
  }, [whop, accountId, amount, currency, renews]);

  if (!sheet || wallets.length === 0) return null;

  const locale = i18n.language;

  const openSheet = (wallet: Wallet) =>
    pay({
      via: 'wallet',
      tokenise: () =>
        sheet
          .show(wallet, { email: checkout.request.email })
          .then((result) => result.ctok)
          .catch((caught: unknown) => {
            if (caught instanceof Error && caught.message === SHEET_DISMISSED) return null;
            console.error('Whop wallet sheet failed', caught);
            throw new WalletSheetError();
          }),
    });

  const isLocked = pendingVia !== null;

  return (
    <div className='@container mb-4 flex w-full flex-col gap-3'>
      <div
        aria-hidden={isLocked || undefined}
        inert={isLocked}
        className='flex flex-col gap-3 @min-[492px]:flex-row @min-[492px]:*:flex-1'
      >
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
      <WhopPaymentProcessingDrawer isOpen={pendingVia === 'wallet' && isCharging} />
      {error && <Paragraph role='alert'>{error}</Paragraph>}
    </div>
  );
}
