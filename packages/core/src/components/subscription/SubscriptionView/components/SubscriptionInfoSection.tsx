import {
  SubscriptionInfoCards,
  SubscriptionInfoCollapsed,
  SubscriptionInfoExpanded,
} from '../../SubscriptionInfo';

export const SubscriptionInfoSection = ({
  activeSubscription,
  blockType,
}: {
  activeSubscription: boolean;
  blockType: 'cards' | 'collapsed' | 'expanded' | 'hidden';
}) => {
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
};
