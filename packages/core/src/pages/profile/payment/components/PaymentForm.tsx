import { Button, Description, FieldError, Form, Input, Label, TextField } from '@heroui/react';
import { IconArrowRight, IconMail } from '@tabler/icons-react';
import { SyntheticEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { validateEmail } from '../../../../utils';
import type { PaymentMethod } from './PaymentMethodSelector';

interface PaymentFormProps {
  selectedMethod: PaymentMethod;
  needsEmailInput: boolean;
  allowedAmounts: string;
  starsAmount: number;
  isPending: boolean;
  starsError: string | null;
  onExtend: (email?: string) => Promise<void>;
  onStarsPayment: () => Promise<void>;
  onTermsOpen: () => void;
}

export function PaymentForm({
  selectedMethod,
  needsEmailInput,
  allowedAmounts,
  starsAmount,
  isPending,
  starsError,
  onExtend,
  onStarsPayment,
  onTermsOpen,
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
    <Form className='mt-6 flex w-full flex-col gap-1' onSubmit={handleSubmit}>
      {showEmailInput && (
        <TextField
          className='w-full'
          isInvalid={emailError.length > 0}
          isRequired
          name='email'
          type='email'
        >
          <Label>{t('login.email_label')}</Label>
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
      )}

      <Button fullWidth isPending={isPending} size='lg' type='submit'>
        {selectedMethod === 'stars'
          ? t('payment.starsPerMonth', { amount: starsAmount })
          : t('payment.pricePerMonth', { amount: allowedAmounts })}
        <IconArrowRight size={20} stroke={2} />
      </Button>

      <p className='mt-1 px-4 text-start text-xs text-muted'>
        {t('terms.paymentConsentLead')}
        <button
          className='cursor-pointer underline underline-offset-2'
          type='button'
          onClick={onTermsOpen}
        >
          {t('terms.paymentLinkLabel')}
        </button>
      </p>

      {starsError && <p className='px-4 text-xs text-danger'>{starsError}</p>}
    </Form>
  );
}
