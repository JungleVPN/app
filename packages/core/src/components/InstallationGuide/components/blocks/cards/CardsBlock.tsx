import { Card } from '@heroui/react';
import { getColorGradient, getLocalizedText } from '../../../../../utils';
import { ThemeIconComponent } from '../../../../ThemeIcon/ThemeIcon';
import { BlockButtons } from '../../BlockButton/BlockButtons';
import type { IBlockRendererProps } from '../rendererBlock.interface';

export const CardsBlockRenderer = ({
  blocks,
  currentLang,
  getIconFromLibrary,
}: IBlockRendererProps) => {
  return (
    <div className='z-[3] flex flex-col gap-2'>
      {blocks.map((block, index) => {
        const gradientStyle = getColorGradient(block.svgIconColor);

        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
          <Card key={index} className='step-card' variant='default'>
            <Card.Content className='flex flex-row items-start gap-2'>
              <ThemeIconComponent
                getIconFromLibrary={getIconFromLibrary}
                gradientStyle={gradientStyle}
                svgIconKey={block.svgIconKey}
              />
              <div className='min-w-0 flex-1'>
                <Card.Title className='break-words text-base'>
                  <span
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
                    dangerouslySetInnerHTML={{
                      __html: getLocalizedText(block.title, currentLang),
                    }}
                  />
                </Card.Title>

                <Card.Description className='mt-1 whitespace-pre-line text-xs leading-relaxed'>
                  <span
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
                    dangerouslySetInnerHTML={{
                      __html: getLocalizedText(block.description, currentLang),
                    }}
                  />
                </Card.Description>

                <div className='mt-2'>
                  <BlockButtons buttons={block.buttons} variant='light' />
                </div>
              </div>
            </Card.Content>
          </Card>
        );
      })}
    </div>
  );
};
