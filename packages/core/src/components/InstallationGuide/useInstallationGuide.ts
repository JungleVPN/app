import type { TSubscriptionPageRawConfig } from '@remnawave/subscription-page-types';
import type { TSubscriptionPagePlatformKey } from '@workspace/types';
import { useMemo, useState } from 'react';
import { useTranslation } from '../../hooks';
import { useSubscriptionConfig } from '../../stores';
import { getIconFromLibrary } from '../../utils';
import type { IBlockRendererProps } from './components/blocks/rendererBlock.interface';
import { type PlatformOption } from './components/PlatformSelector/PlatformSelector';

interface UseInstallationGuideParams {
  hasPlatformApps: Record<TSubscriptionPagePlatformKey, boolean>;
  platform: TSubscriptionPagePlatformKey | undefined;
  type: TSubscriptionPageRawConfig['uiConfig']['installationGuidesBlockType'];
}

function resolveInitialPlatform(
  platform: TSubscriptionPagePlatformKey | undefined,
  hasPlatformApps: Record<TSubscriptionPagePlatformKey, boolean>,
  platforms: Record<string, unknown>,
): TSubscriptionPagePlatformKey {
  if (platform && hasPlatformApps[platform]) return platform;

  const firstWithApps = (Object.keys(hasPlatformApps) as TSubscriptionPagePlatformKey[]).find(
    (key) => hasPlatformApps[key],
  );
  const firstInConfig = Object.keys(platforms)[0] as TSubscriptionPagePlatformKey | undefined;

  return firstWithApps ?? firstInConfig ?? 'ios';
}

export function useInstallationGuide({ hasPlatformApps, platform }: UseInstallationGuideParams) {
  const { t, currentLang } = useTranslation();
  const { platforms, svgLibrary } = useSubscriptionConfig();

  const [selectedPlatformId, setSelectedPlatformId] = useState<TSubscriptionPagePlatformKey>(() =>
    resolveInitialPlatform(platform, hasPlatformApps, platforms),
  );
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

  const handlePlatformSelect = (value: TSubscriptionPagePlatformKey) => {
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
      svgLibrary,
    }),
    [currentLang, selectedApp?.blocks, svgLibrary],
  );

  return {
    selectedPlatformId,
    selectedAppIndex,
    setSelectedAppIndex,
    platformOptions,
    platformApps,
    selectedApp,
    installationBlocksProps,
    handlePlatformSelect,
  };
}
