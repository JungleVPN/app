import { Avatar } from '@heroui/react';
import { useAuthStore } from '@workspace/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useRemnawaveApi } from '../../api';
import Logo from '../../assets/Logo.svg';
import { usePlatformStore } from '../../stores';
import { withReferralParam } from '../../utils';
import { SubscriptionLinkWidget } from '../SubscriptionLinkWidget/SubscriptionLinkWidget';
import { AuthButtons } from './AuthButtons';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const { t } = useTranslation();
  const { authUser, tgUser } = useAuthStore();
  const { platformType } = usePlatformStore();
  const remnawaveApi = useRemnawaveApi();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (platformType !== 'telegram' || !tgUser?.id) return;

    remnawaveApi
      .getMyTelegramPhoto()
      .then(({ photoUrl: url }) => setPhotoUrl(url))
      .catch(() => {});
  }, [platformType, tgUser?.id, remnawaveApi.getMyTelegramPhoto]);

  const getLink = () => {
    if (authUser || platformType === 'telegram') {
      return withReferralParam('/profile/menu');
    }

    return withReferralParam('/');
  };

  return (
    <div className='flex items-center justify-between'>
      <div>
        <Link to={getLink()}>
          {platformType === 'telegram' && photoUrl ? (
            <Avatar size='sm' className='size-[52px]'>
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

      <div className='flex items-center justify-between gap-2'>
        <SubscriptionLinkWidget />
        <LanguageSwitcher />
        {platformType === 'web' && <AuthButtons />}
      </div>
    </div>
  );
}
