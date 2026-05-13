import { Card, Separator } from '@heroui/react';
import { TSubscriptionPageRawConfig } from '@remnawave/subscription-page-types';
import type { TSubscriptionPagePlatformKey } from '@workspace/types';
import { useTranslation } from '../../hooks';
import { useSubscriptionConfig } from '../../stores';
import { AppTabs } from './components/AppTabs/AppTabs';
import {
  AccordionBlockRenderer,
  CardsBlockRenderer,
  MinimalBlockRenderer,
  TimelineBlockRenderer,
} from './components/blocks';
import type { IBlockRendererProps } from './components/blocks/rendererBlock.interface';
import { PlatformSelector } from './components/PlatformSelector/PlatformSelector';
import { useInstallationGuide } from './useInstallationGuide';

export type TBlockVariant = 'accordion' | 'cards' | 'minimal' | 'timeline';

interface IProps {
  hasPlatformApps: Record<TSubscriptionPagePlatformKey, boolean>;
  platform: TSubscriptionPagePlatformKey | undefined;
  type: TSubscriptionPageRawConfig['uiConfig']['installationGuidesBlockType'];
}

function renderBlocks(
  type: TSubscriptionPageRawConfig['uiConfig']['installationGuidesBlockType'],
  props: IBlockRendererProps,
) {
  switch (type) {
    case 'accordion':
      return <AccordionBlockRenderer {...props} />;
    case 'cards':
      return <CardsBlockRenderer {...props} />;
    case 'minimal':
      return <MinimalBlockRenderer {...props} />;
    case 'timeline':
      return <TimelineBlockRenderer {...props} />;
  }
}

export function InstallationGuideConnector({ hasPlatformApps, platform, type }: IProps) {
  const { t, baseTranslations } = useTranslation();
  const { svgLibrary } = useSubscriptionConfig();
  const {
    selectedPlatformId,
    selectedAppIndex,
    setSelectedAppIndex,
    platformOptions,
    platformApps,
    selectedApp,
    installationBlocksProps,
    handlePlatformSelect,
  } = useInstallationGuide({ hasPlatformApps, platform, type });

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
            {renderBlocks(type, installationBlocksProps)}
          </div>
        ) : null}
      </Card.Content>
    </Card>
  );
}
