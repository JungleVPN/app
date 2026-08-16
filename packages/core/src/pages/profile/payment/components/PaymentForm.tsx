import {
  Button,
  Description,
  FieldError,
  Form,
  Input,
  TextField,
  useOverlayState,
} from '@heroui/react';
import { IconArrowRight, IconMail } from '@tabler/icons-react';
import { mainButton } from '@tma.js/sdk-react';
import { PromoDrawer } from '@workspace/core/components';
import type { PaymentMethod } from '@workspace/types';
import { ReactNode, SyntheticEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlatformType, useNavbarStore, useTermsStore } from '../../../../stores';
import { Block } from '../../../../ui';
import { validateEmail } from '../../../../utils';

interface PaymentFormProps {
  selectedMethod: PaymentMethod;
  needsEmailInput: boolean;
  buttonLabel: string;
  isPending: boolean;
  starsError: string | null;
  platformType: PlatformType | null;
  enablePromo?: boolean;
  children?: ReactNode;
  onYookassaPayment: (email?: string, promoCode?: string) => Promise<void>;
  onStripePayment?: (email?: string, promoCode?: string) => Promise<void>;
  onStarsPayment: (promoCode?: string) => Promise<void>;
  onValidatePromo?: (promoCode: string) => Promise<boolean>;
}

export function PaymentForm({
  selectedMethod,
  needsEmailInput,
  buttonLabel,
  isPending,
  starsError,
  enablePromo = true,
  children,
  onYookassaPayment,
  onStripePayment,
  onStarsPayment,
  onValidatePromo,
}: PaymentFormProps) {
  const { t } = useTranslation();
  const { setNavbarVisible } = useNavbarStore();
  const { open: openTerms } = useTermsStore();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const submitRef = useRef<() => Promise<void>>(async () => {});
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const showEmailInput = needsEmailInput;
  const promoDrawer = useOverlayState();

  useEffect(() => {
    if (!enablePromo) return;
    setNavbarVisible(!promoDrawer.isOpen);
  }, [enablePromo, setNavbarVisible, promoDrawer.isOpen]);

  const runPayment = async (promoCode: string) => {
    const emailArg = showEmailInput ? email : undefined;
    const codeArg = promoCode || undefined;
    switch (selectedMethod) {
      case 'stars':
        await onStarsPayment(codeArg);
        break;
      case 'stripe':
        await onStripePayment?.(emailArg, codeArg);
        break;
      case 'yookassa':
        await onYookassaPayment(emailArg, codeArg);
        break;
    }
    promoDrawer.close();
  };

  const handlePromoContinue = async (promoCode: string) => {
    if (promoCode && onValidatePromo) {
      const valid = await onValidatePromo(promoCode);
      if (!valid) return;
    }
    await runPayment(promoCode);
  };

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
    if (enablePromo) {
      promoDrawer.open();
      return;
    }
    await runPayment('');
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
              <span className='pointer-events-none absolute start-4 top-1/2 z-10 flex -translate-y-1/2 items-center text-muted'>
                <IconMail size={20} stroke={1.5} />
              </span>
              <Input
                autoComplete='email'
                className='w-full ps-11'
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
          {buttonLabel}
          <IconArrowRight size={20} stroke={2} className='rtl:-scale-x-100' />
        </Button>
        <p className='ps-4 mt-1 text-start text-xs text-muted'>
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

      {enablePromo && (
        <PromoDrawer
          isOpen={promoDrawer.isOpen}
          isPending={isPending}
          onClose={promoDrawer.close}
          onContinue={handlePromoContinue}
        />
      )}
    </Form>
  );
}
