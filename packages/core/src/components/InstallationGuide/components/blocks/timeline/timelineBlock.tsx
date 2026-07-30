import { Surface } from '@heroui/react';
import { getColorGradientSolid, getLocalizedText } from '../../../../../utils';
import { ThemeIconComponent } from '../../../../ThemeIcon/ThemeIcon';
import { BlockButtons } from '../../BlockButton/BlockButtons';
import type { IBlockRendererProps } from '../rendererBlock.interface';
import classes from './timelineBlock.module.css';

export const TimelineBlockRenderer = ({
  blocks,
  currentLang,
  getIconFromLibrary,
}: IBlockRendererProps) => {
  return (
    <Surface className={`z-[3] ${classes.timelineRoot}`} variant='transparent'>
      <div className='flex flex-col'>
        {blocks.map((block, index) => {
          const gradientStyle = getColorGradientSolid(block.svgIconColor);
          const isLast = index === blocks.length - 1;

          return (
            <div key={index} className={`relative flex gap-3 ${classes.timelineItem}`}>
              <div className='flex flex-col items-center'>
                <div className={classes.timelineItemBullet}>
                  <ThemeIconComponent
                    getIconFromLibrary={getIconFromLibrary}
                    gradientStyle={gradientStyle}
                    svgIconKey={block.svgIconKey}
                  />
                </div>
                {!isLast ? (
                  <div
                    aria-hidden
                    className='mt-1 min-h-[12px] w-px flex-1'
                    style={{ background: 'var(--tl-line-color, rgba(255, 255, 255, 0.08))' }}
                  />
                ) : null}
              </div>
              <div className='min-w-0 flex-1 pb-4'>
                <p
                  className='text-sm font-semibold text-foreground'
                  dangerouslySetInnerHTML={{
                    __html: getLocalizedText(block.title, currentLang),
                  }}
                />
                <p
                  className='mt-1 text-xs leading-relaxed text-muted'
                  dangerouslySetInnerHTML={{
                    __html: getLocalizedText(block.description, currentLang),
                  }}
                />
                <div className='mt-2'>
                  <BlockButtons buttons={block.buttons} variant='light' />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
};
