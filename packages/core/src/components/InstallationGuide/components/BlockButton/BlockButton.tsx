import { Button } from '@heroui/react';
import { getIconFromLibrary, phCapture, TemplateEngine } from '../../../../utils';
import type { TGuideButton } from '../../guideText';

interface BlockButtonProps {
  button: TGuideButton;
  variant: 'secondary' | 'ghost';
  username: string;
  subscriptionUrl: string;
  svgLibrary: Record<string, string>;
  onCopy: (text: string) => Promise<void>;
}

export function BlockButton({
  button,
  variant,
  username,
  subscriptionUrl,
  svgLibrary,
  onCopy,
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
      phCapture('app_connect_clicked', { link: formattedUrl });
      return;
    }
    const url = isExternal ? button.link : formattedUrl;
    phCapture(isExternal ? 'app_download_clicked' : 'app_connect_clicked', { link: url });
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button variant={variant} onPress={handlePress} className={'bg-(--quaternary-fill-background)'}>
      <span
        className='flex items-center [&_svg]:size-4'
        // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted SVG icon string
        dangerouslySetInnerHTML={{ __html: getIconFromLibrary(button.svgIconKey, svgLibrary) }}
      />
      {button.label}
    </Button>
  );
}
