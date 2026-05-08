import {
  Button,
  Card,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from '@heroui/react';
import { IconArrowRight, IconMail } from '@tabler/icons-react';
import { SyntheticEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { validateEmail } from '../../utils';

interface ExtendCardProps {
  /** Show email input — true for Telegram users who have no saved email. */
  showEmailInput: boolean;
  isPaying: boolean;
  /** Display price string, provided by each app from its env. */
  allowedAmounts: string;
  onExtend: (email?: string) => Promise<void>;
  onTermsOpen: () => void;
}

export function ExtendCard({
  showEmailInput,
  isPaying,
  allowedAmounts,
  onExtend,
  onTermsOpen,
}: ExtendCardProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();

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
    <Card variant='secondary'>
      <Card.Content>
        <Form className='flex flex-col gap-4'>
          {/* Order row */}
          <div className='flex items-center justify-between w-full'>
            <p className='text-base font-semibold text-foreground'>
              {t('getSubscription.item_name')}
            </p>
            <p className='text-xl font-bold text-accent'>{allowedAmounts} ₽</p>
          </div>

          <div className='h-px w-full bg-white/10' />

          {/* Email input — only for Telegram users without a saved email */}
          {showEmailInput ? (
            <TextField isRequired isInvalid={emailError.length > 0} name='email' type='email'>
              <Label>{t('login.email_label')}</Label>
              <div className='relative w-full'>
                <span className='absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none flex items-center z-10'>
                  <IconMail size={20} stroke={1.5} />
                </span>
                <Input
                  autoComplete='email'
                  className='pl-11 w-full'
                  placeholder={t('getSubscription.email_placeholder')}
                  value={email}
                  variant='secondary'
                  onChange={(event) => {
                    setEmail(event.target.value);
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
          ) : null}

          <div className={'flex flex-col items-start gap-1'}>
            <Button fullWidth isPending={isPaying} size='lg' type='submit' onClick={handleSubmit}>
              {t('payment.extendButton', { amount: allowedAmounts })}
              <IconArrowRight size={20} stroke={2} />
            </Button>

            <p className='text-xs text-muted text-start px-4'>
              {t('terms.paymentConsentLead')}
              <button
                type='button'
                className='underline underline-offset-2 cursor-pointer'
                onClick={onTermsOpen}
              >
                {t('terms.paymentLinkLabel')}
              </button>
            </p>
          </div>
        </Form>
      </Card.Content>
    </Card>
  );
}
