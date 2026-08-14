import { IconBrandTelegram } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import Logo from '../../assets/Logo_dark.svg?react';
import LogoDark from '../../assets/Logo_dark.svg?react';
import { coreEnv } from '../../env';
import { useTheme } from '../../hooks';

type FooterLinkDef =
  | { type: 'internal'; to: string }
  | { type: 'anchor'; href: string }
  | { type: 'external'; href: string };

const FOOTER_LINKS: Record<
  'terms' | 'privacy' | 'support' | 'affiliate' | 'referral' | 'pricing' | 'trial',
  FooterLinkDef
> = {
  terms: { type: 'internal', to: '/terms' },
  privacy: { type: 'internal', to: '/privacy' },
  support: { type: 'external', href: coreEnv.supportUrl },
  affiliate: { type: 'internal', to: '/affiliates' },
  referral: { type: 'internal', to: '/profile/referrals' },
  pricing: { type: 'anchor', href: '#pricing' },
  trial: { type: 'anchor', href: '#trial' },
};

const LINK_KEYS = ['terms', 'privacy', 'support', 'affiliate', 'referral', 'trial'] as const;

const linkClass = 'text-sm text-muted transition-colors hover:text-foreground';

export function FooterSection() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const socials = [
    { label: 'Telegram', href: coreEnv.supportUrl, icon: <IconBrandTelegram size={18} /> },
  ];

  return (
    <footer className='w-full border-t border-divider'>
      <div className='flex flex-col gap-8 py-12 '>
        <div className='flex flex-col items-start gap-6'>
          <div className={'flex items-center gap-2'}>
            {theme === 'dark' ? (
              <LogoDark aria-label={t('header.logoAlt')} width={56} height={56} />
            ) : (
              <Logo aria-label={t('header.logoAlt')} width={56} height={56} />
            )}
            <p className='text-lg'>JungleVPN</p>
          </div>
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
                  <Link key={key} to={def.to} className={linkClass}>
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
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                target={social.href !== '#' ? '_blank' : undefined}
                rel={social.href !== '#' ? 'noopener noreferrer' : undefined}
                className='text-muted transition-colors hover:text-foreground'
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
