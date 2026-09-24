import { Button, Card, Chip } from '@heroui/react';
import { IconRefresh } from '@tabler/icons-react';
import { ReactNode, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Step1 from '../../assets/icons/how-it-works-step-1.svg?react';
import Step2 from '../../assets/icons/how-it-works-step-2.svg?react';
import Step3 from '../../assets/icons/how-it-works-step-3.svg?react';
import { useNavigation } from '../../hooks';
import { useAppRoutes } from '../../runtime';
import { useAuthStore } from '../../stores';
import { Grid, GridItem } from '../../ui';
import { Heading } from '../../ui/Heading';
import { Paragraph } from '../../ui/Paragraph';
import { PRICING_PATH } from '../../utils';

type StepKey = 'install' | 'subscribe' | 'connect';

type Step = {
  key: StepKey;
  icon: ReactNode;
};

const STEPS: Step[] = [
  { key: 'install', icon: <Step1 /> },
  { key: 'subscribe', icon: <Step2 /> },
  { key: 'connect', icon: <Step3 /> },
];

function StepCard({ step }: { step: Step }) {
  const { t } = useTranslation();
  return (
    <Card
      variant='default'
      className='h-full flex flex-col items-center gap-6 p-8 text-center transition-shadow duration-300 hover:shadow-lg'
    >
      {step.icon}
      <div className='flex flex-col gap-3'>
        <Heading as='h3'>{t(`landing.howItWorks.${step.key}.title`)}</Heading>
        <Paragraph>{t(`landing.howItWorks.${step.key}.description`)}</Paragraph>
      </div>
    </Card>
  );
}

export function HowItWorksSection() {
  const { t } = useTranslation();
  const { authUser } = useAuthStore();
  const { profileSubscriptionPath } = useAppRoutes();

  const navigate = useNavigation();

  const handleClick = useCallback(() => {
    if (!authUser) {
      navigate(PRICING_PATH);
    } else {
      navigate(profileSubscriptionPath);
    }
  }, [authUser, navigate, profileSubscriptionPath]);

  return (
    <section className='mb-24 flex flex-col gap-6'>
      <Heading as='h2'>
        {t('landing.howItWorks.titleStart')}{' '}
        <span className='bg-linear-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent'>
          {t('landing.howItWorks.titleBrand')}
        </span>
      </Heading>

      <Grid>
        {STEPS.map((step) => (
          <GridItem key={step.key} size={{ base: 12, lg: 4 }}>
            <StepCard step={step} />
          </GridItem>
        ))}
      </Grid>

      <div className='flex flex-col gap-3 justify-center items-center'>
        <Paragraph>{t('landing.howItWorks.note')}</Paragraph>
        <div className='flex items-start gap-3'>
          <Button
            size='lg'
            variant='ghost'
            className='h-14 w-48 text-wrap px-2 rounded-4xl bg-linear-to-r from-violet-500 to-amber-400 text-white hover:opacity-90'
            onClick={handleClick}
          >
            {t('landing.hero.cta')}
          </Button>
        </div>
        <Chip color='success' variant='secondary' className='w-fit text-muted'>
          <IconRefresh size={14} />
          <Chip.Label>{t('landing.hero.guarantee')}</Chip.Label>
        </Chip>
      </div>
    </section>
  );
}
