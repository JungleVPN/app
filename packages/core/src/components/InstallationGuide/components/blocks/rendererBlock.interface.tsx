import type { TGuideBlock } from '../../guideText';

/** Visual style for block action buttons (maps to HeroUI `Button` variants). */
export type BlockButtonVariant = 'light' | 'subtle';

export interface IBlockRendererProps {
  blocks: TGuideBlock[];
  getIconFromLibrary: (iconKey: string) => string;
  svgLibrary: Record<string, string>;
}
