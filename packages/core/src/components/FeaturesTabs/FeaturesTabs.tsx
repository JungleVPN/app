import { Tabs } from '@heroui/react';
import type { ReactNode } from 'react';
import { Grid } from '../../ui/Grid/Grid';
import { GridItem } from '../../ui/Grid/GridItem';
import { ContentCard } from '../ContentCard';

export type FeaturesTabItem = {
  title: string;
  description: string;
  icon?: ReactNode;
};

export type FeaturesTab = {
  id: string;
  label: string;
  items: ReadonlyArray<FeaturesTabItem>;
};

type FeaturesTabsProps = {
  tabs: ReadonlyArray<FeaturesTab>;
  ariaLabel: string;
  className?: string;
};

export function FeaturesTabs({ tabs, ariaLabel, className }: FeaturesTabsProps) {
  return (
    <section className={className}>
      <Tabs className='w-full items-center'>
        <Tabs.ListContainer className='max-w-full overflow-x-auto'>
          <Tabs.List aria-label={ariaLabel}>
            {tabs.map(({ id, label }) => (
              <Tabs.Tab key={id} id={id} className='whitespace-nowrap px-5'>
                {label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>

        {tabs.map(({ id, items }) => (
          <Tabs.Panel key={id} id={id} className='w-full pt-10'>
            <Grid>
              {items.map(({ title, description, icon }) => (
                <GridItem key={title} size={{ base: 12, lg: 6 }}>
                  <ContentCard
                    variant='compact'
                    title={title}
                    description={description}
                    icon={icon}
                    className={'bg-background'}
                  />
                </GridItem>
              ))}
            </Grid>
          </Tabs.Panel>
        ))}
      </Tabs>
    </section>
  );
}
