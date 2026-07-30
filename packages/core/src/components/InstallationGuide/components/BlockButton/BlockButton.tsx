import { Button } from '@heroui/react';
import type {
  TSubscriptionPageButtonConfig,
  TSubscriptionPageLocalizedText,
} from '@workspace/types';
import { getIconFromLibrary, TemplateEngine } from '../../../../utils';

interface BlockButtonProps {
  button: TSubscriptionPageButtonConfig;
  variant: 'secondary' | 'ghost';
  username: string;
  subscriptionUrl: string;
  svgLibrary: Record<string, string>;
  onCopy: (text: string) => Promise<void>;
  t: (text: TSubscriptionPageLocalizedText) => string;
}

export function BlockButton({
  button,
  variant,
  username,
  subscriptionUrl,
  svgLibrary,
  onCopy,
  t,
}: BlockButtonProps) {
  const isCopy = button.type === 'copyButton';
  const isExternal = button.type === 'external';

  const formattedUrl =
    isCopy || button.type === 'subscriptionLink'
      ? TemplateEngine.formatWithMetaInfo(button.link, { username, subscriptionUrl })
      : button.link;

  const handlePress = () => {
    if (isCopy) {
      if (formattedUrl) void onCopy(formattedUrl);
      return;
    }
    const url = isExternal ? button.link : formattedUrl;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button variant={variant} onPress={handlePress} className={'bg-(--quaternary-fill-background)'}>
      <span
        className='flex items-center [&_svg]:size-4'
        // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG icon string
        dangerouslySetInnerHTML={{ __html: getIconFromLibrary(button.svgIconKey, svgLibrary) }}
      />
      {t(button.text)}
    </Button>
  );
}
