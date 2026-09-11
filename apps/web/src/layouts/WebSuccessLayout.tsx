import { RootLayout } from '@workspace/core';
import { CookieConsent, PaymentFooter } from '@workspace/core/components';

export function WebSuccessLayout() {
  return (
    <div className='flex min-h-dvh flex-col pt-32 bg-white'>
      <div className='flex flex-1 flex-col'>
        <RootLayout />
      </div>
      <PaymentFooter />
      <CookieConsent />
    </div>
  );
}
