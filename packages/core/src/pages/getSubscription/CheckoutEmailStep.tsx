import { Button, Description, FieldError, Input, Spinner, TextField, Tooltip } from '@heroui/react';
import { IconHelpCircle, IconMail } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Block, Paragraph } from '../../ui';

interface CheckoutEmailStepProps {
  email: string;
  emailError: string;
  checkoutError: string | null;
  isPending: boolean;
  handleEmailChange: (value: string) => void;
  /** Validates the email and moves on to the payment step. */
  handleNext: () => void;
}

/** The email step: the payer's email and nothing else. */
export function CheckoutEmailStep({
  email,
  emailError,
  checkoutError,
  isPending,
  handleEmailChange,
  handleNext,
}: CheckoutEmailStepProps) {
  const { t } = useTranslation();

  return (
    <Block className='p-5 sm:p-6 flex flex-col gap-6'>
      <TextField
        isInvalid={emailError.length > 0}
        isRequired
        aria-label={t('getSubscription.email_label')}
        name='email'
        id='payment-email'
        type='email'
        onKeyDown={(event) => event.key === 'Enter' && handleNext()}
      >
        <div className='relative w-full'>
          <span className='pointer-events-none absolute inset-s-4 top-1/2 z-10 flex -translate-y-1/2 items-center text-muted'>
            <IconMail size={20} stroke={1.5} />
          </span>
          <Input
            autoComplete='email'
            className='w-full rounded-full ps-11 data-invalid:border data-invalid:border-danger'
            placeholder={t('getSubscription.email_placeholder')}
            value={email}
            variant='primary'
            onChange={(event) => handleEmailChange(event.target.value)}
          />
        </div>
        {emailError.length > 0 ? (
          <FieldError className='ms-4'>{emailError}</FieldError>
        ) : (
          <div className='flex items-center ms-4'>
            <Description>{t('getSubscription.email_description')}</Description>
            <Tooltip delay={0} closeDelay={0}>
              <Button
                aria-label={t('getSubscription.email_hint_label')}
                isIconOnly
                size='sm'
                variant='tertiary'
                className='size-5 min-w-0 bg-transparent p-0 text-muted'
              >
                <IconHelpCircle size={16} stroke={2} />
              </Button>
              <Tooltip.Content placement='bottom' showArrow className='max-w-72'>
                <Tooltip.Arrow />
                <Paragraph>{t('getSubscription.email_hint')}</Paragraph>
              </Tooltip.Content>
            </Tooltip>
          </div>
        )}
      </TextField>

      <Button
        className='ms-auto rounded-full w-full mt-4'
        isPending={isPending}
        onPress={handleNext}
      >
        {({ isPending: isNextPending }) => (
          <>
            {t('common.next')}
            {isNextPending ? <Spinner color='current' size='sm' /> : null}
          </>
        )}
      </Button>

      {checkoutError && <Paragraph>{checkoutError}</Paragraph>}
    </Block>
  );
}
