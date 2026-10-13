import { i18n } from '../../core/i18n';
import { Paragraph } from '../../ui';
import { failureFor, type WhopPay } from './useWhopPay';
import { WhopPaymentProcessingDrawer } from './WhopPaymentProcessingDrawer';
import { ApplePayButton, GooglePayButton } from './walletButtons';
import type { WhopCheckoutState } from './whopCheckoutState';
import { getWhopEnvironment } from './whopEnv';
import { showWalletSheet, useWhopWalletSheet, type Wallet } from './whopWallets';

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
  const { pay, pendingVia, isCharging } = payment;
  const error = failureFor(payment, 'wallet');
  const { sheet, wallets } = useWhopWalletSheet({ checkout });

  if (!sheet || wallets.length === 0) return null;

  const locale = i18n.language;

  const openSheet = (wallet: Wallet) =>
    pay({ via: 'wallet', tokenise: () => showWalletSheet(sheet, wallet, checkout.request.email) });

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
