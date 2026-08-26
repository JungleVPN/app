import { Avatar, Button } from '@heroui/react';
import { useAuthStore } from '@workspace/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { useRemnawaveApi } from '../../api';
import Logo from '../../assets/Logo_dark.svg?react';
import LogoDark from '../../assets/Logo_dark.svg?react';
import { useTheme } from '../../hooks';
import { usePlatformStore } from '../../stores';
import { Container } from '../../ui';
import { isLandingPath, isRuDomain, scrollToTop } from '../../utils';
import { Link } from '../Link/Link';
import { SubscriptionLinkWidget } from '../SubscriptionLinkWidget/SubscriptionLinkWidget';
import { SupportButton } from '../SupportWidget/SupportButton';
import { AuthButtons } from './AuthButtons';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileDrawer } from './MobileDrawer';

export function Header() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { authUser, tgUser } = useAuthStore();
  const { platformType, isMobileTma } = usePlatformStore();
  const { theme } = useTheme();
  const remnawaveApi = useRemnawaveApi();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const isLanding = isLandingPath(pathname);
  const isRu = isRuDomain();

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
      <Link href={getLink()} onClick={scrollToTop}>
        {logoNode}
      </Link>

      {isLanding && (
        <nav className='hidden sm:flex items-center gap-6'>
          {(['pricing', 'partnership'] as const).map((id) => (
            <Button
              key={id}
              className='text-sm mix-blend-difference text-[white] hover:underline transition-colors cursor-pointer bg-transparent border-none p-0'
              onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
            >
              {t(`header.nav.${id}`)}
            </Button>
          ))}
        </nav>
      )}

      {/* Desktop controls */}
      <div
        className={`${isLanding ? 'hidden sm:flex' : ''} flex items-center justify-between gap-2 ms-auto`}
      >
        {!isLanding && <SubscriptionLinkWidget />}
        {!isLanding && <SupportButton />}
        {/*{platformType === 'web' && <ThemeToggle />}*/}
        {!isRu && <LanguageSwitcher />}
        {platformType === 'web' && <AuthButtons />}
      </div>

      {/* Mobile: hamburger only */}
      {platformType === 'web' && isLanding && (
        <div className={'flex sm:hidden items-center gap-2 ms-auto'}>
          {!isLanding && <SubscriptionLinkWidget />}
          <MobileDrawer />
        </div>
      )}
    </div>
  );

  const wrapperClass = () => {
    if (isMobileTma) {
      return 'sticky top-0 z-50 shrink-0 py-3 mt-24';
    }

    if (platformType === 'telegram') {
      return 'relative';
    }

    if (!isLanding) return 'relative mt-4';

    return 'w-fit fixed top-4 left-2/4 -translate-x-1/2 z-100';
  };

  return (
    <Container className={wrapperClass()}>
      <div
        className={`w-full px-4 py-1 transition-all duration-300 rounded-2xl ${
          scrolled && platformType !== 'telegram'
            ? 'shadow-lg backdrop-blur-md bg-background/80'
            : ''
        }`}
      >
        {inner}
      </div>
    </Container>
  );
}
