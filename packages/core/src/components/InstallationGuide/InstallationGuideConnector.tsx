import { Card, Separator } from '@heroui/react';
import { TSubscriptionPageRawConfig } from '@remnawave/subscription-page-types';
import type { TSubscriptionPageButtonConfig, TSubscriptionPagePlatformKey } from '@workspace/types';
import { useCallback, useMemo, useState } from 'react';
import { useClipboard, useTranslation } from '../../hooks';
import { useSubscription, useSubscriptionConfig } from '../../stores';
import { getIconFromLibrary, vibrate } from '../../utils';
import { AppTabs } from './components/AppTabs/AppTabs';
import { BlockButton } from './components/BlockButton/BlockButton';
import {
  AccordionBlockRenderer,
  CardsBlockRenderer,
  MinimalBlockRenderer,
  TimelineBlockRenderer,
} from './components/blocks';
import type {
  BlockButtonVariant,
  IBlockRendererProps,
} from './components/blocks/rendererBlock.interface';
import {
  type PlatformOption,
  PlatformSelector,
} from './components/PlatformSelector/PlatformSelector';

export type TBlockVariant = 'accordion' | 'cards' | 'minimal' | 'timeline';

function heroButtonVariant(v: BlockButtonVariant): 'secondary' | 'ghost' {
  return v === 'subtle' ? 'ghost' : 'secondary';
}

interface IProps {
  hasPlatformApps: Record<TSubscriptionPagePlatformKey, boolean>;
  platform: TSubscriptionPagePlatformKey | undefined;
  type: TSubscriptionPageRawConfig['uiConfig']['installationGuidesBlockType'];
}

export function InstallationGuideConnector({ hasPlatformApps, platform, type }: IProps) {
  const { t, currentLang, baseTranslations } = useTranslation();
  const { platforms, svgLibrary } = useSubscriptionConfig();
  const { copy } = useClipboard({ timeout: 2000 });
  const subscription = useSubscription();

  const [selectedPlatformId, setSelectedPlatformId] = useState<TSubscriptionPagePlatformKey>(() => {
    if (platform && hasPlatformApps[platform]) return platform;
    const firstAvailable = (Object.keys(hasPlatformApps) as TSubscriptionPagePlatformKey[]).find(
      (key) => hasPlatformApps[key],
    );
    return firstAvailable ?? (Object.keys(platforms)[0] as TSubscriptionPagePlatformKey) ?? 'ios';
  });
  const [selectedAppIndex, setSelectedAppIndex] = useState(0);

  const platformApps = platforms[selectedPlatformId]?.apps ?? [];

  const platformOptions: PlatformOption[] = (
    Object.entries(hasPlatformApps) as [TSubscriptionPagePlatformKey, boolean][]
  )
    .filter(([, hasApps]) => hasApps)
    .flatMap(([p]) => {
      const cfg = platforms[p];
      if (!cfg) return [];
      return [
        {
          value: p,
          label: t(cfg.displayName),
          icon: getIconFromLibrary(cfg.svgIconKey, svgLibrary),
        },
      ];
    });

  const renderBlockButtons = useCallback(
    (buttons: TSubscriptionPageButtonConfig[], variant: BlockButtonVariant) => {
      if (buttons.length === 0) return null;
      const bv = heroButtonVariant(variant);
      return (
        <div className='flex flex-wrap gap-2'>
          {buttons.map((button) => (
            <BlockButton
              key={`${button.type}:${button.link}:${button.text}`}
              button={button}
              variant={bv}
              username={subscription.user.username}
              subscriptionUrl={subscription.subscriptionUrl}
              svgLibrary={svgLibrary}
              onCopy={copy}
              t={t}
            />
          ))}
        </div>
      );
    },
    [copy, subscription.subscriptionUrl, subscription.user.username, svgLibrary, t],
  );

  const handlePlatformSelect = (value: TSubscriptionPagePlatformKey) => {
    vibrate([80]);
    setSelectedPlatformId(value);
    setSelectedAppIndex(0);
  };

  const safeIndex =
    selectedAppIndex >= 0 && selectedAppIndex < platformApps.length ? selectedAppIndex : 0;
  const selectedApp = platformApps[safeIndex] ?? platformApps[0];

  const installationBlocksProps = useMemo<IBlockRendererProps>(
    () => ({
      blocks: selectedApp?.blocks ?? [],
      currentLang,
      getIconFromLibrary: (key: string) => getIconFromLibrary(key, svgLibrary),
      renderBlockButtons,
      svgLibrary,
    }),
    [currentLang, renderBlockButtons, selectedApp?.blocks, svgLibrary],
  );

  const installationBlocksContent = useMemo(() => {
    switch (type) {
      case 'accordion':
        return <AccordionBlockRenderer {...installationBlocksProps} />;
      case 'cards':
        return <CardsBlockRenderer {...installationBlocksProps} />;
      case 'minimal':
        return <MinimalBlockRenderer {...installationBlocksProps} />;
      case 'timeline':
        return <TimelineBlockRenderer {...installationBlocksProps} />;
    }
  }, [type, installationBlocksProps]);

  return (
    <Card className='z-3' variant='secondary'>
      <Card.Content className='flex flex-col gap-4'>
        <div className='flex items-center justify-between gap-2'>
          <Card.Title className='text-foreground text-lg'>
            {t(baseTranslations.installationGuideHeader)}
          </Card.Title>
          <PlatformSelector
            options={platformOptions}
            selectedPlatformId={selectedPlatformId}
            onSelect={handlePlatformSelect}
          />
        </div>

        <AppTabs
          platformApps={platformApps}
          platformId={selectedPlatformId}
          selectedAppIndex={selectedAppIndex}
          svgLibrary={svgLibrary}
          onAppChange={setSelectedAppIndex}
        />

        {selectedApp ? (
          <div className='mt-4'>
            <Separator className='mb-4' variant='secondary' />
            {installationBlocksContent}
          </div>
        ) : null}
      </Card.Content>
    </Card>
  );
}
