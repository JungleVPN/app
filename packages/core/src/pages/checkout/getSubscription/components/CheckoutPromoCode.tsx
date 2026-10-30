import { Button, Chip } from '@heroui/react';
import { IconCheck, IconCopy, IconTicket } from '@tabler/icons-react';
import type { PublicPromoDto } from '@workspace/types';
import type { TFunction } from 'i18next';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync, useClipboard } from '../../../../hooks';
import { usePaymentsApi } from '../../../../runtime';
import { Paragraph } from '../../../../ui/Paragraph';

/** What the promo gives, then who may use it and until when — only the ones it has. */
function promoConditions(promo: PublicPromoDto, t: TFunction, language: string): string[] {
  const until = promo.endsAt
    ? t('getSubscription.promo.until', {
        date: new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric' }).format(
          new Date(promo.endsAt),
        ),
      })
    : null;
  return [
    t('getSubscription.promo.bonus_days', { count: promo.effect.days }),
    promo.eligibility === 'new' ? t('getSubscription.promo.new_users') : null,
    until,
  ].filter((condition): condition is string => condition !== null);
}

/**
 * The storefront's featured promo on the checkout email step, so the payer has
 * the code at hand when they reach payment. Shows nothing until one is loaded,
 * and nothing at all when there is none or it can't be fetched.
 */
export function CheckoutPromoCode() {
  const { t, i18n } = useTranslation();
  const paymentsApi = usePaymentsApi();
  const { copy, copied } = useClipboard();
  const loadPromos = useCallback(() => paymentsApi.getPromos({ featured: true }), [paymentsApi]);
  const { data, execute } = useAsync(loadPromos);

  useEffect(() => {
    void execute();
  }, [execute]);

  const promo = data?.promos[0];
  if (!promo) return null;

  return (
    <div className='flex items-center gap-3 rounded-3xl border border-dashed border-violet-500/40 bg-violet-500/5 p-3'>
      <span className='flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-500'>
        <IconTicket size={22} stroke={1.75} />
      </span>
      <div className='flex min-w-0 flex-1 flex-col items-start gap-1'>
        <Paragraph className='font-mono font-semibold tracking-wider'>{promo.code}</Paragraph>
        <Chip
          size='sm'
          variant='soft'
          className='h-auto max-w-full whitespace-normal rounded-lg bg-violet-500/15 py-0.5 text-violet-700 dark:text-violet-300'
          data-testid='promo-conditions'
        >
          {promoConditions(promo, t, i18n.language).join(' · ')}
        </Chip>
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
  );
}
