import { Button, Surface } from '@heroui/react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trans, useTranslation } from 'react-i18next';
import Logo from '../../assets/Logo_dark.svg?react';
import { phConsentStatus, phOptIn, phOptOut } from '../../utils';
import { Link } from '../Link/Link';

export function CookieConsent() {
  const { t } = useTranslation();
  const [pending, setPending] = useState(() => phConsentStatus() === 'pending');

  if (!pending) return null;

  const choose = (accept: boolean) => {
    // Declining doesn't stop capture — PostHog falls back to anonymous,
    // cookieless tracking (no persistent identifiers) instead of full opt-out.
    if (accept) {
      phOptIn();
    } else {
      phOptOut();
    }
    setPending(false);
  };

  return createPortal(
    <div className='fixed bottom-2 right-2 w-[90%] max-w-106.25' style={{ zIndex: 9999 }}>
      <Surface variant='tertiary' className='flex flex-col gap-4 rounded-3xl p-5'>
        <div className='flex items-start gap-3'>
          <Logo aria-hidden width={32} height={32} className='shrink-0' />
          <p className='text-sm'>
            <Trans
              i18nKey='cookieConsent.description'
              components={{
                policyLink: (
                  <Link href='/privacy' className='font-semibold underline underline-offset-2' />
                ),
              }}
            />
          </p>
        </div>
        <div className='flex justify-end gap-2'>
          <Button variant='outline' onPress={() => choose(false)}>
            {t('cookieConsent.deny')}
          </Button>
          <Button variant='primary' onPress={() => choose(true)}>
            {t('cookieConsent.accept')}
          </Button>
        </div>
      </Surface>
    </div>,
    document.body,
  );
}
