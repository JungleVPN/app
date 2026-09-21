import { JSX } from 'react';
import IconBrandApple from '../../assets/icons/apple-pay-svgrepo-com.svg?react';
import IconBrandGoogle from '../../assets/icons/google-pay-svgrepo-com.svg?react';
import MastercardLogo from '../../assets/icons/mastercard-svgrepo-com.svg?react';
import MirLogo from '../../assets/icons/mir-svgrepo-com.svg?react';
import VisaLogo from '../../assets/icons/visa-classic-svgrepo-com.svg?react';
import { currentScope } from '../../utils';

export function PaymentMethodIcons({ className = '' }: { className?: string } = {}): JSX.Element {
  const isGlobal = currentScope() === 'global';

  return (
    <div className={`flex flex-wrap items-center justify-center gap-4 text-muted ${className}`}>
      {!isGlobal && <MirLogo aria-label='Mir' className={LOGO_CLASS} />}
      <VisaLogo aria-label='Visa' className={LOGO_CLASS} />
      <MastercardLogo aria-label='Mastercard' className={LOGO_CLASS} />
      {isGlobal && <IconBrandApple className={'h-11 w-auto opacity-90'} />}
      {isGlobal && <IconBrandGoogle className={'h-11 w-auto opacity-90'} />}
    </div>
  );
}

const LOGO_CLASS = 'h-8 w-auto opacity-90';
