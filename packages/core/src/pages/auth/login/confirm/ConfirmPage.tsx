import { Button, Description, Form, InputOTP, REGEXP_ONLY_DIGITS, Surface } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Block, Heading } from '../../../../ui';
import { OTP_LENGTH, useConfirm } from './useConfirm';

export default function ConfirmPage() {
  const { t } = useTranslation();
  const {
    otp,
    timer,
    error,
    loading,
    handleOtpChange,
    handleSubmit,
    handleResend,
    handleChangeEmail,
  } = useConfirm();

  return (
    <Surface className='pt-24' variant='transparent'>
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <Block className={'p-4'}>
          <div className='flex flex-col gap-2 items-center justify-center'>
            <Heading className={'text-lg lg:text-2xl mb-2 text-center'}>
              {t('confirm.title')}
            </Heading>

            {error ? <Description className='text-center text-danger'>{error}</Description> : null}

            <div className='flex w-full max-w-xs flex-col gap-2'>
              <InputOTP
                aria-label={t('a11y.otpCode')}
                autoComplete='one-time-code'
                inputMode='numeric'
                isDisabled={loading}
                maxLength={OTP_LENGTH}
                pattern={REGEXP_ONLY_DIGITS}
                value={otp}
                className={'justify-center'}
                onChange={handleOtpChange}
              >
                <InputOTP.Group>
                  <InputOTP.Slot index={0} />
                  <InputOTP.Slot index={1} />
                  <InputOTP.Slot index={2} />
                </InputOTP.Group>
                <InputOTP.Separator />
                <InputOTP.Group>
                  <InputOTP.Slot index={3} />
                  <InputOTP.Slot index={4} />
                  <InputOTP.Slot index={5} />
                </InputOTP.Group>
              </InputOTP>
            </div>

            <div className='flex flex-col gap-1 mt-4'>
              <Button
                type='submit'
                fullWidth
                isDisabled={otp.length < OTP_LENGTH}
                isPending={loading}
              >
                {t('login.submit')}
              </Button>
              <Button
                isDisabled={timer > 0}
                variant='ghost'
                fullWidth
                onPress={() => void handleResend()}
              >
                {timer > 0 ? t('confirm.resend_in', { timer }) : t('confirm.resend_otp')}
              </Button>
              <Button fullWidth variant='ghost' onPress={handleChangeEmail}>
                {t('confirm.change_email')}
              </Button>
            </div>
            <Description className='text-center text-xs'>{t('confirm.hint')}</Description>
          </div>
        </Block>
      </Form>
    </Surface>
  );
}
