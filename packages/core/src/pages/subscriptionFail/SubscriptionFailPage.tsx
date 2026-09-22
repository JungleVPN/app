import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { coreEnv, getTelegramStickerUrl } from '../../env';
import { useNavigation } from '../../hooks';
import { useAppRoutes } from '../../runtime';
import { TgsSticker } from '../../ui';

export default function SubscriptionFailPage() {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const { publicPlansPath } = useAppRoutes();
  const failStickerUrl = getTelegramStickerUrl(coreEnv.failStickerFileId);

  return (
    <main className='flex min-h-full flex-1 flex-col items-center px-6 pt-16 pb-10 sm:justify-center sm:pt-10'>
      <div className='flex w-full max-w-md flex-1 flex-col items-center sm:flex-none'>
        <div className='flex flex-1 flex-col items-center justify-center gap-10 sm:flex-none sm:gap-12'>
          {failStickerUrl && (
            <TgsSticker className='h-48 w-48 sm:h-56 sm:w-56' src={failStickerUrl} />
          )}

          <div className='flex flex-col items-center gap-3 text-center'>
            <h1 className='text-xl font-bold tracking-tight text-balance'>
              {t('subscriptionFail.title')}
            </h1>
            <p className='text-base text-muted text-balance sm:text-lg'>
              {t('subscriptionFail.description')}
            </p>
          </div>
        </div>

        <Button
          fullWidth
          className='mt-12 sm:mt-10'
          size='lg'
          onPress={() => navigate(publicPlansPath, { replace: true })}
        >
          {t('subscriptionFail.retry')}
        </Button>
      </div>
    </main>
  );
}
