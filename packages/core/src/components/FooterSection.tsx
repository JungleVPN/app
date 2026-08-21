import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import Logo from '../assets/Logo_dark.svg?react';
import LogoDark from '../assets/Logo_dark.svg?react';
import { useTheme } from '../hooks';
import { scrollToTop } from '../utils';
import { SupportButton } from './SupportWidget/SupportButton';

type FooterLinkDef =
  | { type: 'internal'; to: string }
  | { type: 'anchor'; href: string }
  | { type: 'external'; href: string };

const FOOTER_LINKS: Record<
  'terms' | 'privacy' | 'affiliate' | 'referral' | 'pricing' | 'trial',
  FooterLinkDef
> = {
  terms: { type: 'internal', to: '/terms' },
  privacy: { type: 'internal', to: '/privacy' },
  affiliate: { type: 'internal', to: '/affiliates' },
  referral: { type: 'internal', to: '/profile/referrals' },
  pricing: { type: 'anchor', href: '#pricing' },
  trial: { type: 'anchor', href: '#trial' },
};

const LINK_KEYS = ['terms', 'privacy', 'affiliate', 'referral', 'trial'] as const;

const linkClass = 'text-sm text-muted transition-colors hover:text-foreground';

export function FooterSection() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <footer className='w-full'>
      <div className='flex flex-col gap-8 py-12 '>
        <div className='flex flex-col items-start gap-6'>
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
          <p className='text-sm text-muted'>
            {t('landing.footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>

        <div className='flex flex-wrap items-center justify-between gap-6'>
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

          <div className='flex items-center gap-4'>
            <SupportButton />
          </div>
        </div>
      </div>
    </footer>
  );
}
