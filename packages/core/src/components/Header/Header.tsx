import { Avatar, Button } from '@heroui/react';
import { useAuthStore } from '@workspace/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { useRemnawaveApi } from '../../api';
import Logo from '../../assets/Logo_dark.svg?react';
import LogoDark from '../../assets/Logo_dark.svg?react';
import { useTheme } from '../../hooks';
import { usePlatformStore } from '../../stores';

import { SubscriptionLinkWidget } from '../SubscriptionLinkWidget/SubscriptionLinkWidget';
import { AuthButtons } from './AuthButtons';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileDrawer } from './MobileDrawer';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { authUser, tgUser } = useAuthStore();
  const { platformType } = usePlatformStore();
  const { theme } = useTheme();
  const remnawaveApi = useRemnawaveApi();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const isLanding = pathname === '/';

  useEffect(() => {
    if (platformType !== 'telegram' || !tgUser?.id) return;

    remnawaveApi
      .getMyTelegramPhoto()
      .then(({ photoUrl: url }) => setPhotoUrl(url))
      .catch(() => {});
  }, [platformType, tgUser?.id, remnawaveApi.getMyTelegramPhoto]);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    const onScroll = () => setScrolled(root.scrollTop > 0);
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, []);

  const getLink = () => {
    if (!authUser && platformType === 'telegram') return pathname;
    return '/';
  };

  const logoNode =
    platformType === 'telegram' && photoUrl ? (
      <Avatar size='sm' className='size-13'>
        <Avatar.Image alt={tgUser?.first_name ?? 'User'} src={photoUrl} />
        <Avatar.Fallback>{tgUser?.first_name?.[0] ?? 'U'}</Avatar.Fallback>
      </Avatar>
    ) : theme === 'dark' || platformType === 'telegram' ? (
      <LogoDark aria-label={t('header.logoAlt')} width={56} height={56} />
    ) : (
      <Logo aria-label={t('header.logoAlt')} width={56} height={56} />
    );

  const inner = (
    <div className='flex items-center justify-between gap-4'>
      <Link to={getLink()}>{logoNode}</Link>

      {isLanding && (
        <nav className='hidden sm:flex items-center gap-6'>
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

      {/* Desktop controls */}
      <div
        className={`${isLanding ? 'hidden sm:flex' : ''} flex items-center justify-between gap-2 ml-auto`}
      >
        {!isLanding && <SubscriptionLinkWidget />}
        {platformType === 'web' && <ThemeToggle />}
        <LanguageSwitcher />
        {platformType === 'web' && <AuthButtons />}
      </div>

      {/* Mobile: hamburger only */}
      {platformType === 'web' && isLanding && (
        <div className={'flex sm:hidden items-center gap-2 ml-auto'}>
          {!isLanding && <SubscriptionLinkWidget />}
          <MobileDrawer />
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`${platformType === 'telegram' ? 'relative' : 'sticky top-0 z-50 shrink-0 py-3'}`}
    >
      <div
        className={`max-w-[90%] lg:max-w-[60%] xl:max-w-[40%] m-auto px-4 py-2 transition-all duration-300 ${
          scrolled && platformType !== 'telegram'
            ? 'shadow-lg backdrop-blur-md bg-background/80 rounded-2xl'
            : ''
        }`}
      >
        {inner}
      </div>
    </div>
  );
}
