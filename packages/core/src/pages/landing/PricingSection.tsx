import { IconBrandAppleFilled, IconBrandGoogleFilled } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { PriceCard } from '../../components/PriceCard/PriceCard';

function PaymentMethods() {
  return (
    <div className='flex flex-wrap items-center justify-center gap-4'>
      <MastercardIcon />
      <VisaIcon />
      <ApplePayIcon />
      <GooglePayIcon />
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

function ApplePayIcon() {
  return (
    <div className='flex items-center gap-1 opacity-70'>
      <IconBrandAppleFilled />
      <span className='text-sm font-semibold text-foreground'>Pay</span>
    </div>
  );
}

function GooglePayIcon() {
  return (
    <div className='flex items-center gap-1 opacity-70'>
      <IconBrandGoogleFilled />
      <span className='text-sm font-semibold text-foreground'>Pay</span>
    </div>
  );
}

export function PricingSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleCtaClick = () => navigate('/login');

  const sharedProps = {
    currency: '€',
    interval: t('landing.pricing.interval'),
    guarantee: t('landing.pricing.guarantee'),
    cta: t('landing.pricing.cta'),
    totalLabel: t('landing.pricing.totalLabel'),
    onCtaClick: handleCtaClick,
  };

  return (
    <section className='mx-auto w-full px-6 py-24 md:px-12 lg:px-24'>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl'>
          {t('landing.pricing.title')}
        </h2>
        <p className='text-muted text-base lg:text-lg'>{t('landing.pricing.subtitle')}</p>
      </div>

      <div className='flex flex-col items-center gap-8'>
        <div className='grid w-full max-w-5xl grid-cols-1 items-center gap-4 md:grid-cols-3'>
          <PriceCard
            {...sharedProps}
            period={t('landing.pricing.yearlyPeriod')}
            discount={t('landing.pricing.yearlyDiscount')}
            price='3,99'
            originalTotal='95,76 €'
            discountedTotal='47,88 €'
          />

          <PriceCard
            {...sharedProps}
            period={t('landing.pricing.biennialPeriod')}
            discount={t('landing.pricing.biennialDiscount')}
            price='2,99'
            originalTotal='179,40 €'
            discountedTotal='71,76 €'
            badge={t('landing.pricing.badge')}
            highlighted
          />

          <PriceCard
            {...sharedProps}
            period={t('landing.pricing.period')}
            subtitle={t('landing.pricing.monthlySubtitle')}
            price='7,99'
            noDiscountLabel={t('landing.pricing.noDiscount')}
          />
        </div>

        <PaymentMethods />
      </div>
    </section>
  );
}
