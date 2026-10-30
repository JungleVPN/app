import { Button, Chip } from '@heroui/react';
import { IconCheck, IconCopy, IconTicket } from '@tabler/icons-react';
import type { PublicPromoDto } from '@workspace/types';
import type { TFunction } from 'i18next';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync, useClipboard } from '../../../../hooks';
import { usePaymentsApi } from '../../../../runtime';
import { Block, Paragraph } from '../../../../ui';
import { formatPeriod } from '../../../../utils/payment/planPricing';

/** What the promo gives: bonus days, or money off in percent or in its own currency. */
function effectLabel(effect: PublicPromoDto['effect'], t: TFunction, language: string): string {
  switch (effect.type) {
    case 'bonus_months':
      return t('getSubscription.promo.bonus_days', { count: effect.days });
    case 'percentage':
      return t('getSubscription.promo.percent_off', { percent: effect.percent });
    case 'fixed_amount':
      return t('getSubscription.promo.amount_off', {
        amount: new Intl.NumberFormat(language, {
          style: 'currency',
          currency: effect.currency,
        }).format(effect.amount),
      });
  }
}

/** How many payments a discount lasts for; nothing when it lasts forever. */
function durationLabel(promo: PublicPromoDto, t: TFunction): string | null {
  if (promo.duration === 'first_payment') return t('getSubscription.promo.first_payment');
  if (promo.duration === 'multiple_months' && promo.durationMonths !== null) {
    return t('getSubscription.promo.for_months', { count: promo.durationMonths });
  }
  return null;
}

const ELIGIBILITY_KEYS: Readonly<Record<PublicPromoDto['eligibility'], string | null>> = {
  all: null,
  new: 'getSubscription.promo.new_users',
  expired_only: 'getSubscription.promo.churned_users',
};

/** Until when the code works; nothing when it never expires. */
function endsLabel(promo: PublicPromoDto, t: TFunction, language: string): string | null {
  if (!promo.endsAt) return null;
  return t('getSubscription.promo.until', {
    date: new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric' }).format(
      new Date(promo.endsAt),
    ),
  });
}

/** Who may use the code; nothing when anyone can. */
function eligibilityLabel(promo: PublicPromoDto, t: TFunction): string | null {
  const key = ELIGIBILITY_KEYS[promo.eligibility];
  return key ? t(key) : null;
}

/** What the promo gives, then how long and on which plans — only the parts it has. */
function discountLabel(promo: PublicPromoDto, t: TFunction, language: string): string {
  const plans = promo.planPeriods
    ? t('getSubscription.promo.plans', {
        plans: promo.planPeriods.map((days) => formatPeriod(days, t)).join(', '),
      })
    : null;
  return [effectLabel(promo.effect, t, language), durationLabel(promo, t), plans]
    .filter((part): part is string => part !== null)
    .join(' · ');
}

/**
 * The storefront's featured promo on the checkout email step, so the payer has
 * the code at hand when they reach payment. Shows a skeleton while it loads,
 * and nothing when there is none or it can't be fetched.
 */
export function CheckoutPromoCode() {
  const { t, i18n } = useTranslation();
  const paymentsApi = usePaymentsApi();
  const { copy, copied } = useClipboard();
  const loadPromos = useCallback(() => paymentsApi.getPromos({ featured: true }), [paymentsApi]);
  const { data, error, execute } = useAsync(loadPromos);

  useEffect(() => {
    void execute();
  }, [execute]);

  if (!data && !error) return null;
  const promo = data?.promos[0];
  if (!promo) return null;
  const eligibility = eligibilityLabel(promo, t);
  const ends = endsLabel(promo, t, i18n.language);

  return (
    <Block className={'p-1'} title={t('getSubscription.promo.heading')}>
      <div className='flex items-center gap-3 rounded-3xl border border-dashed border-violet-500/40 bg-violet-500/5 p-3'>
        <span className='flex size-10 shrink-0 items-center justify-center rounded-full '>
          <IconTicket size={22} stroke={1.75} />
        </span>
        <div className='flex min-w-0 flex-1 flex-col items-start gap-1'>
          <Paragraph className='font-mono font-semibold tracking-wider'>{promo.code}</Paragraph>
          <div className='flex max-w-full flex-wrap gap-1'>
            <Chip
              size='sm'
              variant='soft'
              className='h-auto max-w-full whitespace-normal rounded-lg bg-violet-500/15 py-0.5 text-violet-700 dark:text-violet-300'
              data-testid='promo-discount'
            >
              {discountLabel(promo, t, i18n.language)}
            </Chip>
            {eligibility && (
              <Chip
                size='sm'
                variant='soft'
                className='h-auto whitespace-nowrap rounded-lg text-muted'
                data-testid='promo-eligibility'
              >
                {eligibility}
              </Chip>
            )}
            {ends && (
              <Chip
                size='sm'
                variant='soft'
                className='h-auto whitespace-nowrap rounded-lg py-0.5 text-muted'
                data-testid='promo-ends'
              >
                {ends}
              </Chip>
            )}
          </div>
        </div>
        <Button
          aria-label={t(copied ? 'getSubscription.promo.copied' : 'getSubscription.promo.copy')}
          isIconOnly
          size='sm'
          variant='tertiary'
          onPress={() => void copy(promo.code)}
        >
          {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
        </Button>
      </div>
    </Block>
  );
}
