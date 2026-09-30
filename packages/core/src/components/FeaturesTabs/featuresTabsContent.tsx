import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import FeaturesIcon from '../../assets/icons/features-icon.svg?react';
import FreedomImage from '../../assets/icons/freedom-icon.svg?react';
import MaskIPImage from '../../assets/icons/privacy-icon.svg?react';
import RoutingIcon from '../../assets/icons/routing-icon.svg?react';
import NoLogsImage from '../../assets/icons/security-icon.svg?react';
import SpeedImage from '../../assets/icons/speed-icon.svg?react';
import type { FeaturesTab } from './FeaturesTabs';

type FeaturesTabItemContent = {
  titleKey: string;
  descriptionKey: string;
  icon: ReactNode;
};

type FeaturesTabContent = {
  id: string;
  labelKey: string;
  items: ReadonlyArray<FeaturesTabItemContent>;
};

const PREFIX = 'landing.featuresTabs';

export const FEATURES_TABS_ARIA_LABEL_KEY = `${PREFIX}.ariaLabel`;

const item = (key: string, icon: ReactNode): FeaturesTabItemContent => ({
  titleKey: `${PREFIX}.items.${key}.title`,
  descriptionKey: `${PREFIX}.items.${key}.description`,
  icon,
});

export const FEATURES_TABS: ReadonlyArray<FeaturesTabContent> = [
  {
    id: 'privacy',
    labelKey: `${PREFIX}.tabs.privacy`,
    items: [item('maskIp', <MaskIPImage />), item('noLogs', <NoLogsImage />)],
  },
  {
    id: 'security-performance',
    labelKey: `${PREFIX}.tabs.securityPerformance`,
    items: [item('highSpeed', <SpeedImage />), item('servers', <FreedomImage />)],
  },
  {
    id: 'features',
    labelKey: `${PREFIX}.tabs.features`,
    items: [item('support', <RoutingIcon />), item('streaming', <FeaturesIcon />)],
  },
];

export function useFeaturesTabs(): { tabs: ReadonlyArray<FeaturesTab>; ariaLabel: string } {
  const { t } = useTranslation();

  return {
    ariaLabel: t(FEATURES_TABS_ARIA_LABEL_KEY),
    tabs: FEATURES_TABS.map(({ id, labelKey, items }) => ({
      id,
      label: t(labelKey),
      items: items.map(({ titleKey, descriptionKey, icon }) => ({
        title: t(titleKey),
        description: t(descriptionKey),
        icon,
      })),
    })),
  };
}
