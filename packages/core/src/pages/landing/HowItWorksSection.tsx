import { Card, Chip } from '@heroui/react';
import { IconAffiliate, IconCloudDownload, IconUserPlus } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Grid, GridItem } from '../../ui';

type StepKey = 'install' | 'subscribe' | 'connect';

type Step = {
  key: StepKey;
  number: string;
  icon: ReactNode;
};

const STEPS: Step[] = [
  { key: 'install', number: '1', icon: <IconCloudDownload stroke={2} /> },
  { key: 'subscribe', number: '2', icon: <IconUserPlus stroke={2} /> },
  { key: 'connect', number: '3', icon: <IconAffiliate stroke={2} /> },
];

function StepCard({ step }: { step: Step }) {
  const { t } = useTranslation();
  return (
    <Card
      variant='secondary'
      className='relative border-gray-500  border border-solid h-full flex flex-col gap-5 overflow-hidden p-7 transition-shadow duration-300 hover:shadow-md'
    >
      <span className='pointer-events-none absolute right-0 -bottom-2 text-8xl font-bold text-violet-100 select-none'>
        {step.number}
      </span>
      <div className='relative z-10 flex flex-col gap-5'>
        <div className='bg-linear-to-br from-purple-400 to-yellow-400 text-white rounded-xl p-3 w-fit'>
          {step.icon}
        </div>
        <div className='flex flex-col gap-2'>
          <h3 className='text-lg font-bold'>{t(`landing.howItWorks.${step.key}.title`)}</h3>
          <p className='text-muted text-sm leading-relaxed'>
            {t(`landing.howItWorks.${step.key}.description`)}
          </p>
        </div>
      </div>
    </Card>
  );
}

export function HowItWorksSection() {
  const { t } = useTranslation();

  return (
    <section className={'mb-24 overflow-hidden'}>
      <div className='mb-14 flex flex-col items-center gap-3 text-center'>
        <Chip color='default' variant='secondary' className='w-fit'>
          <Chip.Label>{t('landing.howItWorks.chip')}</Chip.Label>
        </Chip>
        <h2 className='text-xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl'>
          {t('landing.howItWorks.titleStart')}{' '}
          <span className='bg-linear-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent'>
            {t('landing.howItWorks.titleBrand')}
          </span>
        </h2>

        <p className='text-muted max-w-xl text-base lg:text-md'>
          {t('landing.howItWorks.subtitle')}
        </p>
      </div>

      <Grid>
        {STEPS.map((step) => (
          <GridItem key={step.key} size={{ base: 12, lg: 4 }}>
            <StepCard step={step} />
          </GridItem>
        ))}
      </Grid>
    </section>
  );
}
