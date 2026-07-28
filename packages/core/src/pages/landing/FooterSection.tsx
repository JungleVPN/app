import { IconBrandInstagram, IconBrandTelegram } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import Logo from '../../assets/Logo.svg';

const LINK_KEYS = ['terms', 'support', 'affiliate', 'referral', 'pricing'] as const;

const socials = [
  { label: 'Instagram', href: '#', icon: <IconBrandInstagram size={18} /> },
  { label: 'Telegram', href: '#', icon: <IconBrandTelegram size={18} /> },
];

export function FooterSection() {
  const { t } = useTranslation();

  return (
    <footer className='w-full border-t border-divider'>
      <div className='mx-auto flex max-w-7xl flex-col gap-8 px-6 py-12 md:px-12 lg:px-24'>
        <div className='flex flex-col items-start gap-6'>
          <div className={'flex items-baseline gap-2'}>
            <p className='text-lg'>JungleVPN</p>
            <img
              alt='Logo'
              src={Logo}
              style={{
                width: '42px',
                height: '42px',
              }}
            />
          </div>
          <p className='text-sm text-muted'>
            {t('landing.footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>

        <div className='flex flex-wrap items-center justify-between gap-6'>
          <nav className='flex flex-wrap gap-6'>
            {LINK_KEYS.map((key) => (
              <a
                key={key}
                href='#'
                className='text-sm text-muted transition-colors hover:text-foreground'
              >
                {t(`landing.footer.${key}`)}
              </a>
            ))}
          </nav>

          <div className='flex items-center gap-4'>
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
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
