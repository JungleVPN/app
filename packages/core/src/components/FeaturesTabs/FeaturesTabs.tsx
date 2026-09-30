import { Tabs } from '@heroui/react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
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

const PANEL_VARIANTS: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const CARD_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export function FeaturesTabs({ tabs, ariaLabel, className }: FeaturesTabsProps) {
  const prefersReducedMotion = useReducedMotion();

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
            <motion.div
              variants={PANEL_VARIANTS}
              initial={prefersReducedMotion ? false : 'hidden'}
              animate='visible'
            >
              <Grid>
                {items.map(({ title, description, icon }) => (
                  <GridItem key={title} size={{ base: 12, lg: 6 }}>
                    <motion.div variants={CARD_VARIANTS} className='h-full'>
                      <ContentCard
                        variant='compact'
                        title={title}
                        description={description}
                        icon={icon}
                        className={'bg-background'}
                      />
                    </motion.div>
                  </GridItem>
                ))}
              </Grid>
            </motion.div>
          </Tabs.Panel>
        ))}
      </Tabs>
    </section>
  );
}
