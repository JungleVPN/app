import { Card, Chip } from '@heroui/react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type StepKey = 'install' | 'subscribe' | 'connect';

type Step = {
  key: StepKey;
  number: string;
  color: string;
  bgColor: string;
  icon: ReactNode;
};

type DesktopPosition = {
  left: string;
  top: number;
  rotate: string;
};

const InstallIcon = () => (
  <svg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <path
      d='M16 4v16M10 14l6 6 6-6'
      stroke='currentColor'
      strokeWidth='2.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path d='M6 24h20' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' />
  </svg>
);

const SubscribeIcon = () => (
  <svg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <rect x='6' y='4' width='20' height='24' rx='3' stroke='currentColor' strokeWidth='2.5' />
    <path d='M11 12h10M11 17h7' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' />
    <circle cx='22' cy='22' r='5' fill='currentColor' opacity='0.15' />
    <path
      d='M20 22l1.5 1.5L24 20'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

const ConnectIcon = () => (
  <svg width='32' height='32' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <path d='M16 26a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z' fill='currentColor' />
    <path
      d='M10 19a8.5 8.5 0 0 1 12 0'
      stroke='currentColor'
      strokeWidth='2.5'
      strokeLinecap='round'
    />
    <path
      d='M6 15a14 14 0 0 1 20 0'
      stroke='currentColor'
      strokeWidth='2.5'
      strokeLinecap='round'
    />
    <path
      d='M3 11a19.5 19.5 0 0 1 26 0'
      stroke='currentColor'
      strokeWidth='2.5'
      strokeLinecap='round'
    />
  </svg>
);

const STEPS: Step[] = [
  {
    key: 'install',
    number: '01',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    icon: <InstallIcon />,
  },
  {
    key: 'subscribe',
    number: '02',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    icon: <SubscribeIcon />,
  },
  {
    key: 'connect',
    number: '03',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    icon: <ConnectIcon />,
  },
];

const DESKTOP_POSITIONS: DesktopPosition[] = [
  { left: '20%', top: 0, rotate: '-5deg' },
  { left: '55%', top: 300, rotate: '3deg' },
  { left: '10%', top: 580, rotate: '-3deg' },
];

function StepCard({ step }: { step: Step }) {
  const { t } = useTranslation();
  return (
    <Card
      variant='secondary'
      className='flex flex-col gap-5 p-7 shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl'
    >
      <div className='flex items-start justify-between'>
        <span className={`text-5xl font-bold italic ${step.color}`}>{step.number}</span>
        <div className={`${step.bgColor} ${step.color} rounded-xl p-3`}>{step.icon}</div>
      </div>
      <div className='flex flex-col gap-2'>
        <h3 className='text-lg font-bold'>{t(`landing.howItWorks.${step.key}.title`)}</h3>
        <p className='text-muted text-sm leading-relaxed'>
          {t(`landing.howItWorks.${step.key}.description`)}
        </p>
      </div>
    </Card>
  );
}

export function HowItWorksSection() {
  const { t } = useTranslation();

  return (
    <section>
      <div className='mb-20 flex flex-col items-center gap-3 text-center'>
        <Chip color='default' variant='secondary' className='w-fit'>
          <Chip.Label>{t('landing.howItWorks.chip')}</Chip.Label>
        </Chip>
        <h2 className='text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl'>
          {t('landing.howItWorks.title')}
        </h2>
        <p className='text-muted max-w-xl text-base lg:text-lg'>
          {t('landing.howItWorks.subtitle')}
        </p>
      </div>

      {/* Mobile: vertical stack */}
      <div className='flex flex-col gap-8 lg:hidden'>
        {STEPS.map((step) => (
          <StepCard key={step.key} step={step} />
        ))}
      </div>

      {/* Desktop: staggered diagonal cascade */}
      <div className='relative hidden lg:block' style={{ height: '700px' }}>
        {/* Dashed connector lines */}
        <svg
          className='absolute inset-0 h-full w-full pointer-events-none'
          xmlns='http://www.w3.org/2000/svg'
        >
          {/* Card 01 right-center → Card 02 left-center */}
          <line
            x1='30%'
            y1='20%'
            x2='65%'
            y2='70%'
            stroke='currentColor'
            strokeWidth='2'
            strokeDasharray='9 6'
            className='text-default-300'
          />
          {/* Card 02 right-center → Card 03 left-center */}
          <line
            x1='80%'
            y1='70%'
            x2='50%'
            y2='100%'
            stroke='currentColor'
            strokeWidth='2'
            strokeDasharray='9 6'
            className='text-default-300'
          />
        </svg>

        {/* Cards */}
        {STEPS.map((step, i) => (
          <div
            key={step.key}
            className='absolute w-[60%] lg:w-[40%] z-10'
            style={{
              left: DESKTOP_POSITIONS[i].left,
              top: `${DESKTOP_POSITIONS[i].top}px`,
              transform: `rotate(${DESKTOP_POSITIONS[i].rotate})`,
            }}
          >
            <StepCard step={step} />
          </div>
        ))}
      </div>
    </section>
  );
}
