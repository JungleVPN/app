import { Chip } from '@heroui/react';
import { IconRestore } from '@tabler/icons-react';
import type { SubscriptionPlanDto } from '@workspace/types';
import { type ReactNode, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import Logo from '../../assets/Logo.svg?react';
import { FeaturesCard, Link } from '../../components';
import { Block, Heading, Paragraph } from '../../ui';
import { formatPlanPrice } from '../../utils';
import { formatPeriod } from '../../utils/planPricing';
import { BRAND_GRADIENT } from './brandGradient';

interface CheckoutOrderSummaryProps {
  selectedPeriod: number | null;
  plan: SubscriptionPlanDto | undefined;
  /** A provider's promo code entry, shown under the order. */
  promoCodeSlot?: ReactNode;
  /**
   * An applied promo code's effect on the order, replacing the plan's own
   * discount: `total` is the new amount, absent when the saving can't be
   * priced, and `label` names the saving.
   */
  promoDiscount?: { total?: string; label: string };
  /** Shown under the order when the provider guarantees the price already includes tax. */
  taxNote?: string;
}

/** What the payer is told they will pay. */
export function CheckoutOrderSummary({
  selectedPeriod,
  plan,
  promoCodeSlot,
  promoDiscount,
}: CheckoutOrderSummaryProps) {
  const { t } = useTranslation();
  const [havePromo, setHavePromo] = useState(false);

  // Already resolved to this visitor's own currency by the backend — this
  // form only formats it, and never learns which provider quoted it.
  const pricing = plan?.planPricing ?? null;
  const format = (amount: string) => (pricing ? formatPlanPrice(pricing, amount) : amount);

  // An applied promo code replaces the plan's own discount: the plan price is
  // what gets crossed out, and the promo's saving is the one chip shown.
  const planCrossedOut =
    pricing && pricing.discountPercent > 0 && !plan?.isTrial ? pricing.fullTotal : null;
  const crossedOutPrice = promoDiscount ? promoDiscount.total && pricing?.total : planCrossedOut;
  const planDiscountLabel =
    pricing && pricing.discountPercent > 0
      ? t('getSubscription.discount', { percent: pricing.discountPercent })
      : null;
  const discountLabel = promoDiscount ? promoDiscount.label : planDiscountLabel;

  return (
    <Block
      className='p-5 sm:p-6'
      description={
        <div className='flex items-center px-1'>
          <span className='flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
            <IconRestore stroke={2} />
          </span>
          <Paragraph>{t('getSubscription.guarantee')}</Paragraph>
        </div>
      }
    >
      <div className='flex flex-col gap-5'>
        <Heading as='h3'>{t('getSubscription.order_title')}</Heading>

        {pricing && selectedPeriod !== null ? (
          <div className='flex flex-col gap-2'>
            <div className='flex items-start justify-between gap-4'>
              <div className='flex items-center gap-3'>
                <Logo aria-hidden className='size-8 shrink-0 rounded-lg' />
                <Paragraph>
                  {t('getSubscription.order_item', {
                    period: formatPeriod(selectedPeriod, t),
                  })}
                </Paragraph>
              </div>
              <div className={'flex flex-col items-end gap-1'}>
                <div className='flex shrink-0 items-baseline gap-2'>
                  {crossedOutPrice && (
                    <span className='text-sm text-muted line-through'>
                      {format(crossedOutPrice)}
                    </span>
                  )}
                  <span className='text-base font-semibold'>
                    {format(promoDiscount?.total ?? pricing.total)}
                  </span>
                </div>
                {discountLabel && (
                  <Chip size='sm' className={`w-fit border-none text-[white] ${BRAND_GRADIENT}`}>
                    <Chip.Label>{discountLabel}</Chip.Label>
                  </Chip>
                )}
              </div>
            </div>

            {/*{taxNote && <Paragraph className='text-muted'>{taxNote}</Paragraph>}*/}

            {havePromo ? (
              promoCodeSlot
            ) : (
              <Paragraph
                onClick={() => setHavePromo(true)}
                className={'hover:underline cursor-pointer text-sm lg:text-sm'}
              >
                {t('getSubscription.have_promo')}
              </Paragraph>
            )}
          </div>
        ) : (
          <div className='flex flex-col gap-2'>
            <Paragraph>{t('getSubscription.plan_unavailable_title')}</Paragraph>
            <Paragraph>
              <Trans
                i18nKey='getSubscription.plan_unavailable_description'
                components={{ 1: <Link className='underline' href='/#pricing' /> }}
              />
            </Paragraph>
          </div>
        )}
        <FeaturesCard className='p-5 sm:p-6' title={t('getSubscription.features_title')} />
      </div>
    </Block>
  );
}
