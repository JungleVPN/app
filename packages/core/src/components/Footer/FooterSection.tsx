import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import Logo from '../../assets/Logo_dark.svg?react';
import LogoDark from '../../assets/Logo_dark.svg?react';
import { useTheme } from '../../hooks';
import { Container } from '../../ui';
import { LOCATIONS_PATH, scrollToTop, WHAT_IS_VPN_PATH } from '../../utils';
import { LanguageSwitcher } from '../Header/LanguageSwitcher';
import { PaymentMethodIcons } from '../PaymentMethods/PaymentMethodIcons';
import { Platforms } from '../Platforms/Platforms';
import { SupportButton } from '../SupportWidget/SupportButton';

type FooterLinkDef =
  | { type: 'internal'; to: string }
  | { type: 'anchor'; href: string }
  | { type: 'external'; href: string };

const FOOTER_LINKS: Record<
  'affiliate' | 'referral' | 'locations' | 'pricing' | 'whatIsVpn',
  FooterLinkDef
> = {
  affiliate: { type: 'internal', to: '/affiliates' },
  referral: { type: 'internal', to: '/referrals' },
  locations: { type: 'internal', to: LOCATIONS_PATH },
  pricing: { type: 'internal', to: '/pricing' },
  whatIsVpn: { type: 'internal', to: WHAT_IS_VPN_PATH },
};

const LEGAL_LINKS: Record<'terms' | 'privacy' | 'cookies', FooterLinkDef> = {
  terms: { type: 'internal', to: '/terms' },
  privacy: { type: 'internal', to: '/privacy' },
  cookies: { type: 'internal', to: '/cookies' },
};

const LINK_KEYS = ['pricing', 'locations', 'affiliate', 'referral', 'whatIsVpn'] as const;
const LEGAL_KEYS = ['terms', 'privacy', 'cookies'] as const;

const linkClass = 'text-sm mix-blend-normal transition-colors';

export function FooterSection() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <footer className='w-full'>
      <div className='flex flex-col gap-8 pt-8'>
        <Container className={'mb-8'}>
          <Platforms />
        </Container>
        <Container className='flex flex-col items-start gap-6'>
          <button
            type='button'
            onClick={scrollToTop}
            className='flex items-center gap-2 cursor-pointer bg-transparent border-none p-0'
          >
            {theme === 'dark' ? (
              <LogoDark aria-label={t('header.logoAlt')} width={56} height={56} />
            ) : (
              <Logo aria-label={t('header.logoAlt')} width={56} height={56} />
            )}
            <p className='text-lg'>JungleVPN</p>
          </button>
        </Container>

        <Container className='flex flex-wrap items-center justify-between gap-6'>
          <nav className='flex flex-wrap gap-6'>
            {LINK_KEYS.map((key) => {
              const def = FOOTER_LINKS[key];
              const label = t(`landing.footer.${key}`);
              if (def.type === 'internal') {
                return (
                  <Link key={key} to={def.to} className={linkClass} preventScrollReset={false}>
                    {label}
                  </Link>
                );
              }
              return (
                <a
                  key={key}
                  href={def.href}
                  className={linkClass}
                  {...(def.type === 'external'
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {label}
                </a>
              );
            })}
          </nav>
          <PaymentMethodIcons />
        </Container>

        <div className={'bg-[#2a2a2a]'}>
          <Container className='flex flex-wrap items-center justify-between gap-6  py-8'>
            <p className='text-sm mix-blend-normal'>
              {t('landing.footer.copyright', { year: new Date().getFullYear() })}
            </p>
            <nav className='flex flex-col-reverse gap-2'>
              <div className='flex items-center gap-4'>
                <SupportButton variant='inline' label={t('paymentFooter.support')} />
                <span aria-hidden className='h-4 w-px' />
                <LanguageSwitcher />
              </div>
              <div className={'flex gap-6'}>
                {LEGAL_KEYS.map((key) => {
                  const def = LEGAL_LINKS[key];
                  const label = t(`landing.footer.${key}`);
                  if (def.type === 'internal') {
                    return (
                      <Link key={key} to={def.to} className={linkClass} preventScrollReset={false}>
                        {label}
                      </Link>
                    );
                  }
                  return (
                    <a
                      key={key}
                      href={def.href}
                      className={linkClass}
                      {...(def.type === 'external'
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                    >
                      {label}
                    </a>
                  );
                })}
              </div>
            </nav>
          </Container>
        </div>
      </div>
    </footer>
  );
}
