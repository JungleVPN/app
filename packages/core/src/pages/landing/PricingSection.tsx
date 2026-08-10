import { IconBrandAppleFilled, IconBrandGoogleFilled } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { PriceCard } from '../../components/PriceCard/PriceCard';
import { usePlans } from '../../hooks';

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

type PriceCalculation = {
  price: string;
  discount?: string;
  originalTotal?: string;
  discountedTotal?: string;
  noDiscountLabel?: string;
};

function calculatePricing(
  plan: { months: number; priceEur: string },
  monthlyPrice: number | null,
  discountLabel: (percent: number) => string,
  noDiscountLabel: string,
): PriceCalculation {
  const totalPrice = parseFloat(plan.priceEur);
  const price = (totalPrice / plan.months).toFixed(2);

  if (plan.months === 1) {
    return { price, noDiscountLabel };
  }

  if (monthlyPrice === null) {
    return { price };
  }

  const originalTotalNum = monthlyPrice * plan.months;
  const savedPct = Math.round((1 - totalPrice / originalTotalNum) * 100);

  return {
    price,
    discount: discountLabel(savedPct),
    originalTotal: `€${originalTotalNum.toFixed(2)}`,
    discountedTotal: `€${totalPrice.toFixed(2)}`,
  };
}

export function PricingSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const plans = usePlans();

  function formatMonths(months: number): string {
    if (months === 1) return t('landing.pricing.period');
    if (months === 12) return t('landing.pricing.yearlyPeriod');
    if (months === 24) return t('landing.pricing.biennialPeriod');
    return t('landing.pricing.monthsPeriod', { count: months });
  }

  const handleCtaClick = () => navigate('/profile/plans');

  const sharedProps = {
    currency: '€',
    interval: t('landing.pricing.interval'),
    guarantee: t('landing.pricing.guarantee'),
    cta: t('landing.pricing.cta'),
    totalLabel: t('landing.pricing.totalLabel'),
    onCtaClick: handleCtaClick,
  };

  if (plans.length === 0) return null;

  const monthlyPrice = parseFloat(plans.find((p) => p.months === 1)?.priceEur ?? '0') || null;

  return (
    <section className='py-36 px-0 sm:px-8 md:px-48 lg:px-0'>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl'>
          {t('landing.pricing.title')}
        </h2>
        <p className='text-muted text-base lg:text-lg'>{t('landing.pricing.subtitle')}</p>
      </div>

      <div className='flex flex-col items-center gap-8'>
        <div className='grid w-full max-w-5xl grid-cols-1 items-center gap-4 lg:grid-cols-4'>
          {plans.map((plan, i) => {
            const isHighlighted = i === Math.floor(plans.length / 2) && plans.length > 1;
            const pricing = calculatePricing(
              plan,
              monthlyPrice,
              (percent) => t('landing.pricing.discount', { percent }),
              t('landing.pricing.noDiscount'),
            );

            return (
              <div
                key={plan.months}
                className={isHighlighted ? 'order-first lg:order-0' : 'rounded-t-2xl'}
              >
                <PriceCard
                  {...sharedProps}
                  {...pricing}
                  period={formatMonths(plan.months)}
                  highlighted={isHighlighted}
                  badge={isHighlighted ? t('landing.pricing.badge') : undefined}
                />
              </div>
            );
          })}
        </div>

        <PaymentMethods />
      </div>
    </section>
  );
}
