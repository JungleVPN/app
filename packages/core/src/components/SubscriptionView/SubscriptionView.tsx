import { Button, Card, Surface } from '@heroui/react';
import type { TSubscriptionPagePlatformKey } from '@workspace/types';
import { useTranslation } from 'react-i18next';
import { type SubscriptionDataError, type SubscriptionLoad, useNavigation } from '../../hooks';
import { useIsConfigLoaded, useSubscriptionConfig, useSubscriptionInfoStore } from '../../stores';
import '../../utils/initDayjs';
import { detectOs } from '../../utils';
import { InstallationGuideConnector } from '../InstallationGuide';
import { LoadError, type LoadErrorReason } from '../LoadError/LoadError';
import { Loading } from '../Loading/Loading';
import { SubscriptionInfoSection } from './components/SubscriptionInfoSection';

const LOAD_ERROR_REASONS: Record<SubscriptionDataError, LoadErrorReason> = {
  ERR_FATCH_USER: 'failed_to_fetch_subscription',
  ERR_GET_SUB_LINK: 'failed_to_fetch_subscription_link',
  ERR_PARSE_APPCONFIG: 'failed_to_fetch_subscription_page_config',
};

const OS_TO_PLATFORM: Record<string, TSubscriptionPagePlatformKey> = {
  android: 'android',
  ios: 'ios',
  linux: 'linux',
  macos: 'macos',
  windows: 'windows',
};

/**
 * Pure render component — reads subscription data from the shared Zustand stores.
 * Data fetching is the responsibility of the parent:
 *   - ProfileLayout  for authenticated profile routes
 */
export function SubscriptionView({
  shortUuid,
  load,
}: {
  shortUuid: string;
  load: SubscriptionLoad;
}) {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const config = useSubscriptionConfig();
  const subscription = useSubscriptionInfoStore((state) => state.subscription);
  const isConfigLoaded = useIsConfigLoaded();

  if (load.error) return <LoadError reason={LOAD_ERROR_REASONS[load.error]} onRetry={load.retry} />;
  if (!subscription || !isConfigLoaded) return <Loading />;

  if (!shortUuid) {
    return (
      <Surface
        className='flex min-h-screen w-full items-center justify-center p-4'
        variant='transparent'
      >
        <Card className='max-w-4xl' variant='default'>
          <Card.Header>
            <Card.Title className='text-center text-lg'>
              {t('main.page.component.missing_id')}
            </Card.Title>
          </Card.Header>
        </Card>
      </Surface>
    );
  }

  const hasPlatformApps: Record<TSubscriptionPagePlatformKey, boolean> = {
    ios: Boolean(config.platforms.ios?.apps.length),
    android: Boolean(config.platforms.android?.apps.length),
    linux: Boolean(config.platforms.linux?.apps.length),
    macos: Boolean(config.platforms.macos?.apps.length),
    windows: Boolean(config.platforms.windows?.apps.length),
    androidTV: Boolean(config.platforms.androidTV?.apps.length),
    appleTV: Boolean(config.platforms.appleTV?.apps.length),
  };

  const atLeastOnePlatformApp = Object.values(hasPlatformApps).some(Boolean);
  const activeSubscription = subscription?.user?.userStatus === 'ACTIVE';

  return (
    <Surface className='z-2 flex flex-col gap-4' variant='transparent'>
      <SubscriptionInfoSection
        activeSubscription={activeSubscription}
        blockType={config.uiConfig.subscriptionInfoBlockType}
      />

      {atLeastOnePlatformApp && activeSubscription ? (
        <InstallationGuideConnector
          type={'timeline'}
          hasPlatformApps={hasPlatformApps}
          platform={OS_TO_PLATFORM[detectOs()]}
        />
      ) : (
        <Button fullWidth onClick={() => navigate('/profile/plans')}>
          {t('payment.extendButton')}
        </Button>
      )}
    </Surface>
  );
}
