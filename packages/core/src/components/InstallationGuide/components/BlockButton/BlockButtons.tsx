import { useClipboard } from '../../../../hooks';
import { useSubscription, useSubscriptionConfig } from '../../../../stores';
import type { TGuideButton } from '../../guideText';
import type { BlockButtonVariant } from '../blocks/rendererBlock.interface';
import { BlockButton } from './BlockButton';

interface BlockButtonsProps {
  buttons: TGuideButton[];
  variant: BlockButtonVariant;
}

export function BlockButtons({ buttons, variant }: BlockButtonsProps) {
  const { copy } = useClipboard({ timeout: 2000 });
  const subscription = useSubscription();
  const { svgLibrary } = useSubscriptionConfig();

  if (buttons.length === 0) return null;

  const heroVariant = variant === 'subtle' ? 'ghost' : 'secondary';

  return (
    <div className='flex flex-wrap gap-2'>
      {buttons.map((button) => (
        <BlockButton
          key={`${button.type}:${button.link}:${button.label}`}
          button={button}
          variant={heroVariant}
          username={subscription.user.username}
          subscriptionUrl={subscription.subscriptionUrl}
          svgLibrary={svgLibrary}
          onCopy={copy}
        />
      ))}
    </div>
  );
}
