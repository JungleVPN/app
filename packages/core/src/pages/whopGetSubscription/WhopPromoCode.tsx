import { Button, Chip, Input, Label, TextField } from '@heroui/react';
import { IconTag, IconX } from '@tabler/icons-react';
import type { WhopPromoCodeDto } from '@workspace/types';
import { type KeyboardEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePaymentsApi } from '../../runtime';
import { Paragraph } from '../../ui';
import { checkoutErrorKey } from '../getSubscription/checkoutErrors';

interface WhopPromoCodeProps {
  /** Our plan id, which the backend checks the code against. */
  planId: string;
  applied: WhopPromoCodeDto | null;
  onApplyChange: (promo: WhopPromoCodeDto | null) => void;
}

/**
 * The promo code field. A code is checked against the plan before it counts,
 * so the payer knows their discount before the checkout opens with it. Once
 * applied, the code shows as a chip the payer can remove, and the order
 * summary shows what it does.
 */
export function WhopPromoCode({ planId, applied, onApplyChange }: WhopPromoCodeProps) {
  const { t } = useTranslation();
  const paymentsApi = usePaymentsApi();
  const [value, setValue] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const promoCode = value.trim();

  const edit = (next: string) => {
    setValue(next);
    setError(null);
  };

  const remove = () => {
    setValue('');
    onApplyChange(null);
  };

  const apply = async () => {
    if (!promoCode || isPending) return;

    setIsPending(true);
    setError(null);
    try {
      onApplyChange(await paymentsApi.checkPublicWhopPromoCode({ planId, promoCode }));
    } catch (caught) {
      setError(t(checkoutErrorKey(caught)));
    } finally {
      setIsPending(false);
    }
  };

  // Enter applies the code rather than submitting the checkout form this field sits in.
  const applyOnEnter = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void apply();
  };

  if (applied) {
    return (
      <Chip
        className='w-fit gap-1.5 border border-accent/30 py-0 ps-3 pe-1.5'
        color='default'
        variant='soft'
      >
        <IconTag aria-hidden size={18} stroke={2} />
        <Chip.Label className='font-semibold'>{applied.code}</Chip.Label>
        <Button
          isIconOnly
          aria-label={t('whopCheckout.promo_remove')}
          className='size-6 min-w-0 bg-transparent p-0 text-current'
          size='sm'
          variant='ghost'
          onPress={remove}
        >
          <IconX aria-hidden size={16} stroke={2} />
        </Button>
      </Chip>
    );
  }

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-end gap-2'>
        <TextField className='flex-1' name='promo-code' value={value} onChange={edit}>
          <Label>{t('whopCheckout.promo_code')}</Label>
          <Input autoComplete='off' variant={'secondary'} onKeyDown={applyOnEnter} />
        </TextField>
        <Button isDisabled={!promoCode} isPending={isPending} variant='secondary' onPress={apply}>
          {t('whopCheckout.promo_apply')}
        </Button>
      </div>
      {error && <Paragraph role='alert'>{error}</Paragraph>}
    </div>
  );
}
