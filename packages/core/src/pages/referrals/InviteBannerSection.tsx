import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import InviteArtwork from '../../assets/icons/invite-icon.svg?react';
import { useNavigation } from '../../hooks';
import { useAppRoutes } from '../../runtime';
import { Heading } from '../../ui/Heading';

export function InviteBannerSection() {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const { authGateRedirectPath, profileReferralsPath } = useAppRoutes();

  const inviteHref = `${authGateRedirectPath}?to=${encodeURIComponent(profileReferralsPath)}`;

  return (
    <section>
      <div className='flex flex-col items-center gap-10 overflow-hidden rounded-4xl bg-linear-to-r from-purple-400 to-yellow-400 px-8 py-12 md:flex-row md:justify-between md:px-16 md:py-16'>
        <div className='flex flex-col items-center gap-8 text-center md:items-start md:text-start'>
          <Heading as='h2' className={'text-white'}>
            {t('referrals.inviteBanner.title')}
          </Heading>

          <Button
            size='lg'
            className='h-14 rounded-4xl bg-white px-10 font-semibold text-[#1a1a1a] hover:opacity-90'
            onClick={() => navigate(inviteHref)}
          >
            {t('referrals.inviteBanner.cta')}
          </Button>
        </div>

        <InviteArtwork className='h-56 w-full max-w-md md:h-72' />
      </div>
    </section>
  );
}
