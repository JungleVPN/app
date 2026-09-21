import type { SubscriptionPlanDto } from '@workspace/types';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { PaymentMethodIcons } from '../../components';
import { PriceCard } from '../../components/PriceCard/PriceCard';
import { useNavigation, usePlans } from '../../hooks';
import { Grid, GridItem } from '../../ui';
import { calculatePricing, cn } from '../../utils';
import { planSlug } from '../getSubscription/planSlug';

const HIGHLIGHTED_PLAN_PERIOD = 12;
const HIGHLIGHTED_DESKTOP_POSITION = 2;

const ORDER_CLASSES = ['order-0', 'order-1', 'order-2', 'order-3'] as const;
const LG_ORDER_CLASSES = ['lg:order-0', 'lg:order-1', 'lg:order-2', 'lg:order-3'] as const;

type PlanOrder = { mobile: number; desktop: number };

function buildPlanOrders(plans: SubscriptionPlanDto[]): Map<number, PlanOrder> {
  const highlighted = plans.find((plan) => plan.period === HIGHLIGHTED_PLAN_PERIOD);

  if (!highlighted) {
    return new Map(plans.map((plan, i) => [plan.period, { mobile: i, desktop: i }]));
  }

  const others = plans.filter((plan) => plan.period !== HIGHLIGHTED_PLAN_PERIOD);
  const desktopOrder = [
    ...others.slice(0, HIGHLIGHTED_DESKTOP_POSITION),
    highlighted,
    ...others.slice(HIGHLIGHTED_DESKTOP_POSITION),
  ];
  const mobileOrder = [highlighted, ...others];

  const orders = new Map<number, PlanOrder>();
  desktopOrder.map((plan, i) => orders.set(plan.period, { mobile: 0, desktop: i }));
  mobileOrder.forEach((plan, i) => {
    orders.set(plan.period, { ...orders.get(plan.period)!, mobile: i });
  });

  return orders;
}

/**
 * The section sits on the white landing page and on the dark gradient hero of
 * the pricing page, so its copy colours follow the surface it is placed on.
 */
type Surface = 'light' | 'dark';

const HEADING_CLASS: Record<Surface, string> = {
  light: 'text-black',
  dark: 'text-white',
};

const BODY_CLASS: Record<Surface, string> = {
  light: 'text-muted',
  dark: 'text-white/70',
};

/**
 * `animateOnMount` staggers the cards in as the page loads — used on the pricing page,
 * where the plans are the hero. On the landing page the section sits far below the fold,
 * so the animation would play unseen and the cards are rendered static instead.
 */
export function PricingSection({
  surface = 'light',
  animateOnMount = false,
}: {
  surface?: Surface;
  animateOnMount?: boolean;
} = {}) {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const plans = usePlans();

  function formatMonths(months: number): string {
    if (months === 1) return t('landing.pricing.period');
    if (months === 12) return t('landing.pricing.yearlyPeriod');
    return t('landing.pricing.monthsPeriod', { count: months });
  }

  const handleCtaClick = (months: number) => navigate(`/payment/${planSlug(months)}`);

  const sharedProps = {
    interval: t('landing.pricing.interval'),
    guarantee: t('landing.pricing.guarantee'),
    cta: t('landing.pricing.cta'),
    totalLabel: t('landing.pricing.totalLabel'),
  };

  if (plans.length === 0) return null;

  const planOrders = buildPlanOrders(plans);

  return (
    <section>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h1
          className={cn(
            'text-2xl sm:px-0 font-bold tracking-tight lg:text-4xl',
            HEADING_CLASS[surface],
          )}
        >
          {t('landing.pricing.title')}
        </h1>
        <p className={cn('text-base lg:text-md', BODY_CLASS[surface])}>
          {t('landing.pricing.subtitle')}
        </p>
      </div>

      <div className='flex flex-col items-center gap-8'>
        <Grid>
          {plans.map((plan) => {
            const isHighlighted = plan.period === HIGHLIGHTED_PLAN_PERIOD;
            const pricing = calculatePricing(plan, {
              discountLabel: (percent: number) =>
                plan.period === 12
                  ? t('landing.pricing.discountBest', { percent })
                  : t('landing.pricing.discount', { percent }),
              noDiscountLabel: t('landing.pricing.noDiscount'),
            });

            const period = formatMonths(plan.period);
            const badge = isHighlighted ? t('landing.pricing.badgeValue') : undefined;
            const order = planOrders.get(plan.period)!;

            return (
              <GridItem
                key={plan.period}
                size={{ base: 12, sm: 12, md: 6, lg: 3 }}
                className={cn(
                  !isHighlighted && 'rounded-t-2xl',
                  ORDER_CLASSES[order.mobile],
                  LG_ORDER_CLASSES[order.desktop],
                )}
              >
                <motion.div
                  className='h-full'
                  initial={animateOnMount ? { opacity: 0, y: 24 } : false}
                  animate={animateOnMount ? { opacity: 1, y: 0 } : undefined}
                  transition={{
                    duration: 0.45,
                    ease: 'easeOut',
                    delay: order.desktop * 0.12,
                  }}
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
                    onCtaClick={() => handleCtaClick(plan.period)}
                  />
                </motion.div>
              </GridItem>
            );
          })}
        </Grid>

        <PaymentMethodIcons />
      </div>
    </section>
  );
}
