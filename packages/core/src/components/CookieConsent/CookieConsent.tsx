import { Button, Surface } from '@heroui/react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trans, useTranslation } from 'react-i18next';
import Logo from '../../assets/Logo_dark.svg?react';
import { readCookie, writeCookie } from '../../utils';
import { Link } from '../Link/Link';

const COOKIE_NAME = 'cookie_consent';
const COOKIE_MAX_AGE_DAYS = 365;

type Consent = 'accepted' | 'denied';

export function CookieConsent() {
  const { t } = useTranslation();
  const [consent, setConsent] = useState<Consent | null>(
    () => readCookie(COOKIE_NAME) as Consent | null,
  );

  if (consent) return null;

  const choose = (value: Consent) => {
    writeCookie(COOKIE_NAME, value, { maxAgeDays: COOKIE_MAX_AGE_DAYS });
    setConsent(value);
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
          <Button variant='outline' onPress={() => choose('denied')}>
            {t('cookieConsent.deny')}
          </Button>
          <Button variant='primary' onPress={() => choose('accepted')}>
            {t('cookieConsent.accept')}
          </Button>
        </div>
      </Surface>
    </div>,
    document.body,
  );
}
