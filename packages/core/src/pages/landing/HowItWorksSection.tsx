import { Button, Card, Chip } from '@heroui/react';
import { IconRefresh } from '@tabler/icons-react';
import { ReactNode, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import Step1 from '../../assets/icons/how-it-works-step-1.svg?react';
import Step2 from '../../assets/icons/how-it-works-step-2.svg?react';
import Step3 from '../../assets/icons/how-it-works-step-3.svg?react';
import { useAppRoutes } from '../../runtime';
import { useAuthStore } from '../../stores';
import { Grid, GridItem } from '../../ui';
import { isGlobalOrigin, PRICING_PATH } from '../../utils';

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
        <h3 className='text-xl font-bold'>{t(`landing.howItWorks.${step.key}.title`)}</h3>
        <p className='text-muted text-sm leading-relaxed'>
          {t(`landing.howItWorks.${step.key}.description`)}
        </p>
      </div>
    </Card>
  );
}

export function HowItWorksSection() {
  const { t } = useTranslation();
  const { authUser } = useAuthStore();
  const { profileSubscriptionPath } = useAppRoutes();

  const navigate = useNavigate();
  const isRu = !isGlobalOrigin();

  const handleClick = useCallback(() => {
    if (isRu) {
      navigate('/login');
    } else {
      if (!authUser) {
        navigate(PRICING_PATH);
      } else {
        navigate(profileSubscriptionPath);
      }
    }
  }, [authUser, isRu, navigate, profileSubscriptionPath]);

  return (
    <section className='mb-24'>
      <h2 className='mb-14 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl'>
        {t('landing.howItWorks.titleStart')}{' '}
        <span className='bg-linear-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent'>
          {t('landing.howItWorks.titleBrand')}
        </span>
      </h2>

      <Grid>
        {STEPS.map((step) => (
          <GridItem key={step.key} size={{ base: 12, lg: 4 }}>
            <StepCard step={step} />
          </GridItem>
        ))}
      </Grid>

      <div className='flex flex-col gap-3 justify-center items-center'>
        <p className='text-muted mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed'>
          {t('landing.howItWorks.note')}
        </p>
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
