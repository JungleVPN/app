import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';

interface StarsPaymentButtonProps {
  isDisabled: boolean;
  error: string | null;
  onPress: () => void;
}

export function StarsPaymentButton({ isDisabled, error, onPress }: StarsPaymentButtonProps) {
  const { t } = useTranslation();

  return (
    <div className='flex w-full flex-col items-center gap-3'>
      <div className='flex w-full items-center gap-3 px-1'>
        <div className='h-px flex-1 bg-border' />
        <span className='text-xs text-muted'>{t('payment.stars.orDivider')}</span>
        <div className='h-px flex-1 bg-border' />
      </div>

      <Button fullWidth isDisabled={isDisabled} variant='tertiary' onPress={onPress}>
        {t('payment.stars.buttonLabel')}
      </Button>

      {error && <p className='text-xs text-danger'>{error}</p>}
    </div>
  );
}
