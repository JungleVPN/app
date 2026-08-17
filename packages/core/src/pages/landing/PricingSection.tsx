import { IconBrandAppleFilled, IconBrandGoogleFilled, IconCheck } from '@tabler/icons-react';
import type { SubscriptionPlanDto } from '@workspace/types';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { PriceCard } from '../../components/PriceCard/PriceCard';
import { usePlans } from '../../hooks';
import { Grid, GridItem } from '../../ui';
import { cn, formatPlanPrice, isRuDomain } from '../../utils';

const HIGHLIGHTED_PLAN_MONTHS = 12;
const HIGHLIGHTED_DESKTOP_POSITION = 2;

const ORDER_CLASSES = ['order-0', 'order-1', 'order-2', 'order-3'] as const;
const LG_ORDER_CLASSES = ['lg:order-0', 'lg:order-1', 'lg:order-2', 'lg:order-3'] as const;

type PlanOrder = { mobile: number; desktop: number };

function buildPlanOrders(plans: SubscriptionPlanDto[]): Map<number, PlanOrder> {
  const highlighted = plans.find((plan) => plan.months === HIGHLIGHTED_PLAN_MONTHS);

  if (!highlighted) {
    return new Map(plans.map((plan, i) => [plan.months, { mobile: i, desktop: i }]));
  }

  const others = plans.filter((plan) => plan.months !== HIGHLIGHTED_PLAN_MONTHS);
  const desktopOrder = [
    ...others.slice(0, HIGHLIGHTED_DESKTOP_POSITION),
    highlighted,
    ...others.slice(HIGHLIGHTED_DESKTOP_POSITION),
  ];
  const mobileOrder = [highlighted, ...others];

  const orders = new Map<number, PlanOrder>();
  desktopOrder.map((plan, i) => orders.set(plan.months, { mobile: 0, desktop: i }));
  mobileOrder.forEach((plan, i) => {
    orders.set(plan.months, { ...orders.get(plan.months)!, mobile: i });
  });

  return orders;
}

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

const INCLUDES_KEYS = ['includes1', 'includes2', 'includes3', 'includes4', 'includes5'] as const;

function PlanIncludes() {
  const { t } = useTranslation();

  return (
    <div className='flex flex-col items-center gap-3'>
      <span className='text-sm font-semibold text-foreground'>
        {t('landing.pricing.includesTitle')}
      </span>
      <ul className='flex flex-wrap items-center justify-center gap-x-5 gap-y-2'>
        {INCLUDES_KEYS.map((key) => (
          <li key={key} className='flex items-center gap-1.5 text-sm text-muted'>
            <IconCheck size={16} className='shrink-0 text-success' strokeWidth={2.5} />
            {t(`landing.pricing.${key}`)}
          </li>
        ))}
      </ul>
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
  plan: SubscriptionPlanDto,
  isRu: boolean,
  discountLabel: (percent: number, isBestValue: boolean) => string,
  noDiscountLabel: string,
): PriceCalculation {
  const pricing = isRu ? plan.rub : plan.eur;

  if (plan.months === 1) {
    return { price: pricing.monthly, noDiscountLabel };
  }

  if (pricing.discountPercent <= 0 || !pricing.fullTotal) {
    return { price: pricing.monthly };
  }

  return {
    price: pricing.monthly,
    discount: discountLabel(pricing.discountPercent, plan.months === 12),
    originalTotal: formatPlanPrice(pricing.fullTotal, isRu),
    discountedTotal: formatPlanPrice(pricing.total, isRu),
  };
}

export function PricingSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const plans = usePlans();

  function formatMonths(months: number): string {
    if (months === 1) return t('landing.pricing.period');
    if (months === 12) return t('landing.pricing.yearlyPeriod');
    return t('landing.pricing.monthsPeriod', { count: months });
  }

  const handleCtaClick = () => navigate('/profile/plans');
  const isRu = isRuDomain();

  const sharedProps = {
    currency: isRu ? '₽' : '€',
    interval: t('landing.pricing.interval'),
    guarantee: t('landing.pricing.guarantee'),
    cta: t('landing.pricing.cta'),
    totalLabel: t('landing.pricing.totalLabel'),
    onCtaClick: handleCtaClick,
  };

  if (plans.length === 0) return null;

  const planOrders = buildPlanOrders(plans);

  return (
    <section>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl'>
          {t('landing.pricing.title')}
        </h2>
        <p className='text-muted text-base lg:text-md'>{t('landing.pricing.subtitle')}</p>
      </div>

      <div className='flex flex-col items-center gap-8'>
        <PlanIncludes />

        <Grid>
          {plans.map((plan) => {
            const isHighlighted = plan.months === HIGHLIGHTED_PLAN_MONTHS;
            const pricing = calculatePricing(
              plan,
              isRu,
              (percent, isBestValue) =>
                isBestValue
                  ? t('landing.pricing.discountBest', { percent })
                  : t('landing.pricing.discount', { percent }),
              t('landing.pricing.noDiscount'),
            );

            const period = formatMonths(plan.months);
            const badge = isHighlighted ? t('landing.pricing.badgeValue') : undefined;
            const order = planOrders.get(plan.months)!;

            return (
              <GridItem
                key={plan.months}
                size={{ base: 12, sm: 12, md: 6, lg: 3 }}
                className={cn(
                  !isHighlighted && 'rounded-t-2xl',
                  ORDER_CLASSES[order.mobile],
                  LG_ORDER_CLASSES[order.desktop],
                )}
              >
                <PriceCard
                  {...sharedProps}
                  {...pricing}
                  period={period}
                  cta={
                    isHighlighted
                      ? t('landing.pricing.ctaPlan', { period })
                      : t('landing.pricing.cta')
                  }
                  highlighted={isHighlighted}
                  badge={badge}
                />
              </GridItem>
            );
          })}
        </Grid>

        <PaymentMethods />
      </div>
    </section>
  );
}
