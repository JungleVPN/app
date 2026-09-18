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
import {
  isGlobalOrigin,
  isLandingPath,
  isMarketingPath,
  isPlansOrPaymentPlanPath,
  PRICING_PATH,
  phCapture,
  scrollToTop,
} from '../../utils';
import { Link } from '../Link/Link';
import { SubscriptionLinkWidget } from '../SubscriptionLinkWidget/SubscriptionLinkWidget';
import { SupportButton } from '../SupportWidget/SupportButton';
import { AuthButtons } from './AuthButtons';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileDrawer } from './MobileDrawer';

const navLinkClass =
  'text-base mix-blend-difference text-[white] hover:underline transition-colors cursor-pointer bg-transparent border-none p-0';

export function Header() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { authUser, tgUser } = useAuthStore();
  const { platformType, isMobileTma } = usePlatformStore();
  const { theme } = useTheme();
  const remnawaveApi = useRemnawaveApi();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [isRu, setIsRu] = useState(false);

  const isLanding = isMarketingPath(pathname);
  const isTelegram = platformType === 'telegram';
  const hideAuthButtons = isPlansOrPaymentPlanPath(pathname);

  useEffect(() => {
    setIsRu(!isGlobalOrigin());
  }, []);

  useEffect(() => {
    if (platformType !== 'telegram' || !tgUser?.id) return;

    remnawaveApi
      .getMyTelegramPhoto()
      .then(({ photoUrl: url }) => setPhotoUrl(url))
      .catch(() => {});
  }, [platformType, tgUser?.id, remnawaveApi.getMyTelegramPhoto]);

  useEffect(() => {
    const root = document.getElementById('root');
    const onScroll = () => setScrolled(window.scrollY > 0 || (root?.scrollTop ?? 0) > 0);
    window.addEventListener('scroll', onScroll, { passive: true });
    root?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      root?.removeEventListener('scroll', onScroll);
    };
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
      <Logo aria-label={t('header.logoAlt')} width={36} height={36} />
    );

  const inner = (
    <div className='flex items-center justify-between gap-16 min-h-15'>
      <Link
        href={getLink()}
        onClick={scrollToTop}
        className={'flex items-center justify-center gap-2'}
      >
        {logoNode}
        <span className={'font-primary font-extrabold text-xl'}>JungleVPN</span>
      </Link>

      {isLanding && (
        <nav className='hidden sm:flex items-center gap-6'>
          <Link
            href={PRICING_PATH}
            className={navLinkClass}
            onClick={() => {
              phCapture('landing_pricing_link_clicked');
              scrollToTop();
            }}
          >
            {t('header.nav.pricing')}
          </Link>
          {isLandingPath(pathname) && (
            <Button
              className={navLinkClass}
              onClick={() => {
                phCapture('landing_partnership_link_clicked');
                document.getElementById('partnership')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {t('header.nav.partnership')}
            </Button>
          )}
        </nav>
      )}

      {/* Desktop controls */}
      <div
        className={`${isLanding ? 'hidden sm:flex' : ''} flex items-center justify-between gap-2 ms-auto`}
      >
        {!isLanding && <SubscriptionLinkWidget />}
        {!isLanding && <SupportButton />}
        {!isRu && !isTelegram && <LanguageSwitcher />}
        {platformType === 'web' && !hideAuthButtons && <AuthButtons isRu={isRu} />}
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

    return 'w-fit fixed top-4 left-2/4 -translate-x-1/2 z-100';
  };

  return (
    <header>
      <Container className={wrapperClass()}>
        <div
          className={`w-full px-4 py-1 transition-all duration-300 rounded-2xl ${
            scrolled && platformType !== 'telegram'
              ? 'shadow-lg backdrop-blur-md bg-background/80'
              : !isLanding
                ? 'shadow-none'
                : 'md:shadow-lg md:backdrop-blur-md md:bg-background/80'
          } `}
        >
          {inner}
        </div>
      </Container>
    </header>
  );
}
