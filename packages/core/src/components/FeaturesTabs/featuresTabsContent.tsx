import FeaturesIcon from '../../assets/icons/features-icon.svg?react';
import FreedomImage from '../../assets/icons/freedom-icon.svg?react';
import MaskIPImage from '../../assets/icons/privacy-icon.svg?react';
import RoutingIcon from '../../assets/icons/routing-icon.svg?react';
import NoLogsImage from '../../assets/icons/security-icon.svg?react';
import SpeedImage from '../../assets/icons/speed-icon.svg?react';
import type { FeaturesTab } from './FeaturesTabs';

export const FEATURES_TABS: ReadonlyArray<FeaturesTab> = [
  {
    id: 'privacy',
    label: 'Privacy',
    items: [
      {
        title: 'Mask your IP',
        description:
          'Jungle VPN hides your real IP address, preventing the easiest and most accurate way for websites to track you online.',
        icon: <MaskIPImage />,
      },
      {
        title: 'No-logs policy',
        description:
          'Jungle VPN keeps no logs that can compromise your privacy and under Swiss law we can’t be obligated to start logging.',
        icon: <NoLogsImage />,
      },
    ],
  },
  {
    id: 'security-performance',
    label: 'Security & Performance',
    items: [
      {
        title: 'High-speed',
        description: 'Our network of high-speed VPN servers offers connections up to 10 Gbps.',
        icon: <SpeedImage />,
      },
      {
        title: 'Servers & locations',
        description:
          'Jungle VPN runs over 100 servers in over 6 countries so you can always connect to the fastest or most useful location for your needs.',
        icon: <FreedomImage />,
      },
    ],
  },
  {
    id: 'features',
    label: 'Features',
    items: [
      {
        title: 'Customer support / Live chat',
        description:
          'If you have any questions, contact our friendly and professional support team. With a paid plan, Live chat support is available most hours.',
        icon: <RoutingIcon />,
      },
      {
        title: 'Streaming',
        description:
          'Watch your favourite shows, movies, and sports events buffering-free when traveling away from home. Jungle VPN supports many popular streaming services around the world.',
        icon: <FeaturesIcon />,
      },
    ],
  },
];
