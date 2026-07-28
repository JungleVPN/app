import { Avatar, Button } from '@heroui/react';
import { useAuthStore } from '@workspace/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { useRemnawaveApi } from '../../api';
import Logo from '../../assets/Logo.svg';
import { usePlatformStore } from '../../stores';
import { withReferralParam } from '../../utils';
import { SubscriptionLinkWidget } from '../SubscriptionLinkWidget/SubscriptionLinkWidget';
import { AuthButtons } from './AuthButtons';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { authUser, tgUser } = useAuthStore();
  const { platformType } = usePlatformStore();
  const remnawaveApi = useRemnawaveApi();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (platformType !== 'telegram' || !tgUser?.id) return;

    remnawaveApi
      .getTelegramPhotoUrl(String(tgUser.id))
      .then(({ photoUrl: url }) => setPhotoUrl(url))
      .catch(() => {});
  }, [platformType, tgUser?.id, remnawaveApi.getTelegramPhotoUrl]);

  const getLink = () => {
    if (authUser || platformType === 'telegram') {
      return withReferralParam('/profile/menu');
    }

    return withReferralParam('/');
  };

  return (
    <div className='flex items-center justify-between max-w-200 m-auto'>
      <div>
        <Link to={getLink()}>
          {platformType === 'telegram' && photoUrl ? (
            <Avatar size='sm' className='size-13'>
              <Avatar.Image alt={tgUser?.first_name ?? 'User'} src={photoUrl} />
              <Avatar.Fallback>{tgUser?.first_name?.[0] ?? 'U'}</Avatar.Fallback>
            </Avatar>
          ) : (
            <img
              alt={t('header.logoAlt')}
              src={Logo}
              style={{
                width: '42px',
                height: '42px',
              }}
            />
          )}
        </Link>
      </div>

      {pathname === '/' && (
        <nav className='flex items-center gap-6'>
          {(['partnership', 'pricing'] as const).map((id) => (
            <Button
              key={id}
              className='text-sm text-foreground/70 hover:text-foreground transition-colors cursor-pointer bg-transparent border-none p-0'
              onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
            >
              {t(`header.nav.${id}`)}
            </Button>
          ))}
        </nav>
      )}

      <div className='flex items-center justify-between gap-2'>
        <SubscriptionLinkWidget />
        <LanguageSwitcher />
        {platformType === 'web' && <AuthButtons />}
      </div>
    </div>
  );
}
