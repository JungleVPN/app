import { Surface } from '@heroui/react';
import { getColorGradient, getLocalizedText } from '../../../../../utils';
import { ThemeIconComponent } from '../../../../ThemeIcon/ThemeIcon';
import { BlockButtons } from '../../BlockButton/BlockButtons';
import type { IBlockRendererProps } from '../rendererBlock.interface';
import classes from './minimalBlock.module.css';

export const MinimalBlockRenderer = ({
  blocks,
  currentLang,
  getIconFromLibrary,
}: IBlockRendererProps) => {
  return (
    <Surface className='z-[3] flex flex-col gap-4' variant='transparent'>
      {blocks.map((block, index) => {
        const gradientStyle = getColorGradient(block.svgIconColor);

        return (
          <Surface key={index} className={classes.stepBlock} variant='transparent'>
            <div className='mb-2 flex flex-nowrap items-start gap-2'>
              <ThemeIconComponent
                getIconFromLibrary={getIconFromLibrary}
                gradientStyle={gradientStyle}
                svgIconKey={block.svgIconKey}
              />
              <p
                className='text-sm font-medium text-foreground'
                dangerouslySetInnerHTML={{
                  __html: getLocalizedText(block.title, currentLang),
                }}
              />
            </div>
            <p
              className='text-xs leading-relaxed text-muted'
              dangerouslySetInnerHTML={{
                __html: getLocalizedText(block.description, currentLang),
              }}
            />
            {block.buttons.length > 0 ? (
              <div className='mt-2'>
                <BlockButtons buttons={block.buttons} variant='subtle' />
              </div>
            ) : null}
          </Surface>
        );
      })}
    </Surface>
  );
};
