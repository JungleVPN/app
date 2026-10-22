import { i18n } from '../../../../i18n';
import { ApplePayButton, GooglePayButton } from '../../whopCheckout/components/walletButtons';
import { getWhopEnvironment } from '../../whopCheckout/utils/whopEnv';
import type { Wallet } from '../../whopCheckout/utils/whopWallets';

interface WhopWalletSubmitProps {
  wallet: Wallet;
  /** The vendor buttons cannot be disabled, so the block is made inert instead. */
  isDisabled: boolean;
  onClick: () => void;
}

/**
 * The submit button of a wallet tab: the vendor's own Apple Pay or Google Pay
 * button, unmodified as their guidelines require, in place of our own.
 */
export function WhopWalletSubmit({ wallet, isDisabled, onClick }: WhopWalletSubmitProps) {
  const locale = i18n.language;

  return (
    <div
      aria-disabled={isDisabled || undefined}
      inert={isDisabled}
      className={isDisabled ? 'opacity-50' : undefined}
    >
      {wallet === 'apple_pay' ? (
        <ApplePayButton locale={locale} onClick={onClick} />
      ) : (
        <GooglePayButton environment={getWhopEnvironment()} locale={locale} onClick={onClick} />
      )}
    </div>
  );
}
