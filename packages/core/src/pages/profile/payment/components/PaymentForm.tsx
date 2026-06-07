import { Button, Description, FieldError, Form, Input, TextField } from '@heroui/react';
import { IconArrowRight, IconMail } from '@tabler/icons-react';
import { mainButton } from '@tma.js/sdk-react';
import { ReactNode, SyntheticEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlatformType, useNavbarStore, useTermsStore } from '../../../../stores';
import { Block } from '../../../../ui';
import { validateEmail } from '../../../../utils';
import type { PaymentMethod } from './PaymentMethodSelector';

interface PaymentFormProps {
  selectedMethod: PaymentMethod;
  needsEmailInput: boolean;
  allowedAmounts: string;
  stripeAmount: string;
  starsAmount: number;
  buttonLabel?: string;
  isPending: boolean;
  starsError: string | null;
  platformType: PlatformType | null;
  children?: ReactNode;
  onYookassaPayment: (email?: string) => Promise<void>;
  onStripePayment?: (email?: string) => Promise<void>;
  onStarsPayment: () => Promise<void>;
}

export function PaymentForm({
  selectedMethod,
  needsEmailInput,
  allowedAmounts,
  stripeAmount,
  starsAmount,
  buttonLabel,
  isPending,
  starsError,
  children,
  onYookassaPayment,
  onStripePayment,
  onStarsPayment,
}: PaymentFormProps) {
  const { t } = useTranslation();
  const { setNavbarVisible } = useNavbarStore();
  const { open: openTerms } = useTermsStore();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const submitRef = useRef<() => Promise<void>>(async () => {});
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const showEmailInput = needsEmailInput;

  const labelByMethod: Record<PaymentMethod, string> = {
    yookassa: t('payment.pricePerMonth', { amount: allowedAmounts }),
    stripe: t('payment.stripePerMonth', { amount: stripeAmount }),
    stars: t('payment.starsPerMonth', { amount: starsAmount }),
  };
  const buttonText = buttonLabel ?? labelByMethod[selectedMethod];

  useEffect(() => {
    return window.scrollTo({
      top: buttonRef.current?.getBoundingClientRect().top,
      behavior: 'smooth',
    });
  }, []);

  submitRef.current = async () => {
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
    const emailArg = showEmailInput ? email : undefined;
    switch (selectedMethod) {
      case 'stars':
        await onStarsPayment();
        return;
      case 'stripe':
        await onStripePayment?.(emailArg);
        return;
      case 'yookassa':
        await onYookassaPayment(emailArg);
        return;
    }
  };

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    await submitRef.current();
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
                onBlur={() => {
                  mainButton.show();
                  setNavbarVisible(true);
                }}
                onFocus={() => {
                  mainButton.hide();
                  setNavbarVisible(false);
                }}
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

      <div>
        <Button fullWidth isPending={isPending} size='lg' type='submit' ref={buttonRef}>
          {buttonText}
          <IconArrowRight size={20} stroke={2} />
        </Button>
        <p className='pl-4 mt-1 text-start text-xs text-muted'>
          {t('terms.paymentConsentLead')}
          <button
            className='cursor-pointer underline underline-offset-2'
            type='button'
            onClick={openTerms}
          >
            {t('terms.paymentLinkLabel')}
          </button>
        </p>
      </div>
      {starsError && <p className='px-4 text-xs text-danger'>{starsError}</p>}
      {children}
    </Form>
  );
}
