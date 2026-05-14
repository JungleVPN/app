import { useAuthStore } from '@workspace/core';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import Logo from '../../assets/Logo.svg';
import { usePlatformStore } from '../../stores';
import { SubscriptionLinkWidget } from '../SubscriptionLinkWidget/SubscriptionLinkWidget';
import { AuthButtons } from './AuthButtons';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const { t } = useTranslation();
  const { authUser } = useAuthStore();
  const { platformType } = usePlatformStore();
  const getLink = () => {
    if (authUser || platformType === 'telegram') {
      return '/profile/subscription';
    }

    return '/';
  };
  return (
    <div className='flex items-center justify-between'>
      <div>
        <Link to={getLink()}>
          <img
            alt={t('header.logoAlt')}
            src={Logo}
            style={{
              width: '52px',
              height: '52px',
            }}
          />
        </Link>
      </div>

      <div className='flex items-center justify-between gap-2'>
        <SubscriptionLinkWidget />
        <LanguageSwitcher />
        {platformType === 'web' && <AuthButtons />}
      </div>
    </div>
  );
}
