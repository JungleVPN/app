import { Button, Description, FieldError, Form, Input, TextField } from '@heroui/react';
import { IconArrowRight, IconMail } from '@tabler/icons-react';
import { mainButton } from '@tma.js/sdk-react';
import { ReactNode, SyntheticEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlatformType, useNavbarStore } from '../../../../stores';
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
  platformType: PlatformType | null;
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
  platformType,
  children,
  onExtend,
  onStarsPayment,
}: PaymentFormProps) {
  const { t } = useTranslation();
  const { setNavbarVisible } = useNavbarStore();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const showEmailInput = needsEmailInput;
  const isTelegram = platformType === 'telegram';

  const buttonText =
    selectedMethod === 'stars'
      ? t('payment.starsPerMonth', { amount: starsAmount })
      : t('payment.pricePerMonth', { amount: allowedAmounts });

  const submitRef = useRef<() => Promise<void>>(async () => {});
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
    if (selectedMethod === 'stars') {
      await onStarsPayment();
      return;
    }
    await onExtend(showEmailInput ? email : undefined);
  };

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    await submitRef.current();
  };

  useEffect(() => {
    if (!isTelegram) return;
    mainButton.mount();
    mainButton.show();
    mainButton.enableShineEffect();
    return () => {
      mainButton.hide();
      mainButton.unmount();
    };
  }, [isTelegram]);

  useEffect(() => {
    if (!isTelegram) return;
    mainButton.setText(buttonText);
  }, [isTelegram, buttonText]);

  useEffect(() => {
    if (!isTelegram) return;
    if (isPending) {
      mainButton.showLoader();
      mainButton.disable();
    } else {
      mainButton.hideLoader();
      mainButton.enable();
    }
  }, [isTelegram, isPending]);

  useEffect(() => {
    if (!isTelegram) return;
    return mainButton.onClick(() => submitRef.current());
  }, [isTelegram]);

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

      {children}

      {!isTelegram && (
        <Button fullWidth isPending={isPending} size='lg' type='submit'>
          {buttonText}
          <IconArrowRight size={20} stroke={2} />
        </Button>
      )}

      {starsError && <p className='px-4 text-xs text-danger'>{starsError}</p>}
    </Form>
  );
}
