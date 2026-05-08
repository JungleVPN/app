import { Card, Surface } from '@heroui/react';
import type { TSubscriptionPagePlatformKey } from '@workspace/types';
import { useTranslation } from 'react-i18next';
import type { SubscriptionDataError } from '../../hooks';
import {
  useIsConfigLoaded,
  useSubscriptionConfig,
  useSubscriptionInfoStoreInfo,
} from '../../stores';

import '../../utils/initDayjs';
import { detectOs } from '../../utils';
import { InstallationGuideConnector } from '../InstallationGuide';
import { Loading } from '../Loading/Loading';
import {
  SubscriptionInfoCards,
  SubscriptionInfoCollapsed,
  SubscriptionInfoExpanded,
} from '../SubscriptionInfo';
import { ErrorView } from './components/ErrorView';

const OS_TO_PLATFORM: Record<string, TSubscriptionPagePlatformKey> = {
  android: 'android',
  ios: 'ios',
  linux: 'linux',
  macos: 'macos',
  windows: 'windows',
};

function subscriptionInfoSection(
  activeSubscription: boolean,
  blockType: 'cards' | 'collapsed' | 'expanded' | 'hidden',
) {
  const effectiveType = activeSubscription ? blockType : 'expanded';
  switch (effectiveType) {
    case 'cards':
      return <SubscriptionInfoCards />;
    case 'collapsed':
      return <SubscriptionInfoCollapsed />;
    case 'hidden':
      return null;
    case 'expanded':
      return <SubscriptionInfoExpanded />;
  }
}

/**
 * Pure render component — reads subscription data from the shared Zustand stores.
 * Data fetching is the responsibility of the parent:
 *   - ProfileLayout  for authenticated profile routes
 *   - SubscriptionPage for the public /subscription/:shortUuid route
 */
export function SubscriptionView({
  shortUuid,
  error = null,
}: {
  shortUuid: string;
  /** Error from the parent's useSubscriptionData call, if any. */
  error?: SubscriptionDataError | null;
}) {
  const { t } = useTranslation();
  const config = useSubscriptionConfig();
  const { subscription } = useSubscriptionInfoStoreInfo();
  const isConfigLoaded = useIsConfigLoaded();

  if (error) return <ErrorView errorCode={error} />;
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
      {subscriptionInfoSection(activeSubscription, config.uiConfig.subscriptionInfoBlockType)}

      {atLeastOnePlatformApp && activeSubscription ? (
        <InstallationGuideConnector
          type={'timeline'}
          hasPlatformApps={hasPlatformApps}
          platform={OS_TO_PLATFORM[detectOs()]}
        />
      ) : null}
    </Surface>
  );
}
