import { useTranslation } from 'react-i18next';
import { PriceCard } from '../../components/PriceCard/PriceCard';

const ADVANTAGE_KEYS = ['advantage1', 'advantage2', 'advantage3', 'advantage4'] as const;

function PaymentMethods() {
  return (
    <div className='flex flex-wrap items-center justify-center gap-4'>
      <MastercardIcon />
      <VisaIcon />
      <BitcoinIcon />
      <ApplePayIcon />
      <GooglePayIcon />
      <AmexIcon />
      <DiscoverIcon />
    </div>
  );
}

function MastercardIcon() {
  return (
    <div className='flex items-center'>
      <div className='h-7 w-7 rounded-full bg-red-500 opacity-90' />
      <div className='-ml-3 h-7 w-7 rounded-full bg-orange-400 opacity-80' />
    </div>
  );
}

function VisaIcon() {
  return (
    <span className='text-base font-extrabold tracking-widest text-foreground opacity-70'>
      VISA
    </span>
  );
}

function BitcoinIcon() {
  return (
    <div className='flex items-center gap-1 opacity-70'>
      <svg
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill='currentColor'
        className='text-orange-500'
      >
        <path d='M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1.5 14.5h-1v1h-1v-1H10v-1h.5V9H10V8h1.5V7h1v1h.5a2 2 0 010 4 2 2 0 010 4h-.5zm-1-5h1a1 1 0 000-2h-1v2zm0 4h1a1 1 0 000-2h-1v2z' />
      </svg>
      <svg width='20' height='20' viewBox='0 0 24 24' fill='currentColor' className='text-blue-400'>
        <path d='M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 4l3.5 6H8.5L12 6zm0 12l-3.5-6h7L12 18z' />
      </svg>
    </div>
  );
}

function ApplePayIcon() {
  return (
    <div className='flex items-center gap-1 opacity-70'>
      <svg
        width='16'
        height='16'
        viewBox='0 0 24 24'
        fill='currentColor'
        className='text-foreground'
      >
        <path d='M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09z' />
      </svg>
      <span className='text-sm font-semibold text-foreground'>Pay</span>
    </div>
  );
}

function GooglePayIcon() {
  return (
    <div className='flex items-center gap-1 opacity-70'>
      <span className='text-sm font-semibold'>
        <span className='text-blue-500'>G</span>
      </span>
      <span className='text-sm font-semibold text-foreground'>Pay</span>
    </div>
  );
}

function AmexIcon() {
  return (
    <div className='flex h-6 items-center justify-center rounded bg-blue-600 px-2 opacity-80'>
      <span className='text-[10px] font-bold tracking-wider text-white'>AMEX</span>
    </div>
  );
}

function DiscoverIcon() {
  return (
    <div className='flex items-center gap-1 opacity-70'>
      <span className='text-sm font-bold text-foreground tracking-wide'>DISCOVER</span>
    </div>
  );
}

export function PricingSection() {
  const { t } = useTranslation();

  const advantages = ADVANTAGE_KEYS.map((key) => t(`landing.pricing.${key}`));

  return (
    <section className='mx-auto w-full px-6 py-24 md:px-12 lg:px-24'>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl'>
          {t('landing.pricing.title')}{' '}
          <span className='text-primary'>{t('landing.pricing.titleHighlight')}</span>
        </h2>
        <p className='text-muted text-base lg:text-lg'>{t('landing.pricing.subtitle')}</p>
      </div>

      <div className='flex flex-col items-center gap-8'>
        <PriceCard
          period={t('landing.pricing.period')}
          currency='€'
          price='7.99'
          interval={t('landing.pricing.interval')}
          advantages={advantages}
          guarantee={t('landing.pricing.guarantee')}
          cta={t('landing.pricing.cta')}
        />
        <PaymentMethods />
      </div>
    </section>
  );
}
