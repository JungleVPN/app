import { Button, Description, FieldError, Form, Input, TextField } from '@heroui/react';
import { IconArrowRight, IconMail } from '@tabler/icons-react';
import { ReactNode, SyntheticEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Block } from '../../../../ui';
import { validateEmail } from '../../../../utils';
import type { PaymentMethod } from './PaymentMethodSelector';

interface PaymentFormProps {
  selectedMethod: PaymentMethod;
  needsEmailInput: boolean;
  allowedAmounts: string;
  starsAmount: number;
  isPending: boolean;
  starsError: string | null;
  children?: ReactNode;
  onExtend: (email?: string) => Promise<void>;
  onStarsPayment: () => Promise<void>;
}

export function PaymentForm({
  selectedMethod,
  needsEmailInput,
  allowedAmounts,
  starsAmount,
  isPending,
  starsError,
  children,
  onExtend,
  onStarsPayment,
}: PaymentFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const showEmailInput = needsEmailInput;

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

    if (selectedMethod === 'stars') {
      await onStarsPayment();
      return;
    }

    if (showEmailInput) {
      if (!email.trim()) {
        setEmailError(t('getSubscription.error_empty_email'));
        return;
      }
      if (!validateEmail(email)) {
        setEmailError(t('getSubscription.error_invalid_email'));
        return;
      }
    }

    await onExtend(showEmailInput ? email : undefined);
  };

  return (
    <Form className='flex w-full flex-col gap-7' onSubmit={handleSubmit}>
      {showEmailInput && (
        <Block className={'p-4'}>
          <TextField
            className='w-full'
            variant='secondary'
            isInvalid={emailError.length > 0}
            isRequired
            name='email'
            type='email'
          >
            <div className='relative w-full'>
              <span className='pointer-events-none absolute left-4 top-1/2 z-10 flex -translate-y-1/2 items-center text-muted'>
                <IconMail size={20} stroke={1.5} />
              </span>
              <Input
                autoComplete='email'
                className='w-full pl-11'
                placeholder={t('getSubscription.email_placeholder')}
                value={email}
                variant='secondary'
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
              />
            </div>
            {emailError.length > 0 ? (
              <FieldError>{emailError}</FieldError>
            ) : (
              <Description>{t('getSubscription.email_description')}</Description>
            )}
          </TextField>
        </Block>
      )}

      {children}

      <Button fullWidth isPending={isPending} size='lg' type='submit'>
        {selectedMethod === 'stars'
          ? t('payment.starsPerMonth', { amount: starsAmount })
          : t('payment.pricePerMonth', { amount: allowedAmounts })}
        <IconArrowRight size={20} stroke={2} />
      </Button>
      {starsError && <p className='px-4 text-xs text-danger'>{starsError}</p>}
    </Form>
  );
}
