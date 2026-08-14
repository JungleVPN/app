import type { TSubscriptionPageBlockConfig, TSubscriptionPageLanguageCode } from '@workspace/types';

/** Visual style for block action buttons (maps to HeroUI `Button` variants). */
export type BlockButtonVariant = 'light' | 'subtle';

export interface IBlockRendererProps {
  blocks: TSubscriptionPageBlockConfig[];
  currentLang: TSubscriptionPageLanguageCode;
  getIconFromLibrary: (iconKey: string) => string;
  svgLibrary: Record<string, string>;
}
