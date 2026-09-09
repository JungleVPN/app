import { RootLayout } from '@workspace/core';

/**
 * Checkout shell: wider than WebRootLayout so the payment steps and the order
 * summary can sit side by side from `lg` up. The header comes from WebAppLayout.
 */
export function WebPaymentLayout() {
  return (
    <div className='mt-8'>
      <RootLayout />
    </div>
  );
}
