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
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { authUser, tgUser } = useAuthStore();
  const { platformType } = usePlatformStore();
  const remnawaveApi = useRemnawaveApi();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const isLanding = pathname === '/';

  useEffect(() => {
    if (platformType !== 'telegram' || !tgUser?.id) return;

    remnawaveApi
      .getMyTelegramPhoto()
      .then(({ photoUrl: url }) => setPhotoUrl(url))
      .catch(() => {});
  }, [platformType, tgUser?.id, remnawaveApi.getMyTelegramPhoto]);

  const getLink = () => {
    if (!authUser && platformType === 'telegram') return withReferralParam(pathname);

    return withReferralParam('/');
  };

  return (
    <div className='flex items-center justify-start max-w-200 m-auto gap-12'>
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

      {isLanding && (
        <nav className='flex items-center gap-6'>
          {(['pricing', 'partnership'] as const).map((id) => (
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

      <div className='flex items-center justify-between gap-2 ml-auto'>
        {!isLanding && <SubscriptionLinkWidget />}
        {platformType === 'web' && <ThemeToggle />}
        <LanguageSwitcher />
        {platformType === 'web' && <AuthButtons />}
      </div>
    </div>
  );
}
