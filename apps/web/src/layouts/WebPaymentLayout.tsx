import { RootLayout, usePlatformStore } from '@workspace/core';
import { PaymentFooter } from '@workspace/core/components';

/**
 * Checkout shell: wider than WebRootLayout so the payment steps and the order
 * summary can sit side by side from `lg` up. The header comes from WebAppLayout.
 */
export function WebPaymentLayout() {
  const { platformType } = usePlatformStore();

  return (
    <div
      className={`${platformType === 'web' ? 'pt-32' : ''} flex flex-col justify-between h-screen`}
    >
      <RootLayout />
      <PaymentFooter />
    </div>
  );
}
