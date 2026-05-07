import { Button, Disclosure, DisclosureGroup, Separator, Surface } from '@heroui/react';
import { useState } from 'react';
import { getLocalizedText, vibrate } from '../../../../../utils';
import type { IBlockRendererProps } from '../rendererBlock.interface';

export const AccordionBlockRenderer = ({
  blocks,
  currentLang,
  renderBlockButtons,
}: IBlockRendererProps) => {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set(['0']));

  return (
    <DisclosureGroup
      allowsMultipleExpanded={false}
      className='z-[3]'
      expandedKeys={expandedKeys}
      onExpandedChange={(keys) => {
        vibrate('tap');
        setExpandedKeys(keys as Set<string>);
      }}
    >
      <Surface className='flex flex-col gap-0' variant='transparent'>
        {blocks.map((block, index) => {
          const id = String(index);
          const isOpen = expandedKeys.has(id);

          return (
            <div key={id}>
              {index > 0 ? <Separator variant='secondary' /> : null}
              <Disclosure id={id}>
                <Disclosure.Heading>
                  <Button
                    className='h-auto w-full justify-between gap-2 px-3 py-2 text-start'
                    slot='trigger'
                    variant={isOpen ? 'secondary' : 'ghost'}
                  >
                    <span className='flex min-w-0 flex-1 items-center gap-2'>
                      <span
                        className='truncate text-sm font-semibold text-foreground'
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
                        dangerouslySetInnerHTML={{
                          __html: getLocalizedText(block.title, currentLang),
                        }}
                      />
                    </span>
                    <Disclosure.Indicator className='text-muted' />
                  </Button>
                </Disclosure.Heading>
                <Disclosure.Content>
                  <Disclosure.Body className='px-3 pb-3'>
                    <p
                      className='text-xs leading-relaxed text-muted'
                      // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
                      dangerouslySetInnerHTML={{
                        __html: getLocalizedText(block.description, currentLang),
                      }}
                    />
                    <div className='mt-2 flex flex-wrap gap-2'>
                      {renderBlockButtons(block.buttons, 'light')}
                    </div>
                  </Disclosure.Body>
                </Disclosure.Content>
              </Disclosure>
            </div>
          );
        })}
      </Surface>
    </DisclosureGroup>
  );
};
