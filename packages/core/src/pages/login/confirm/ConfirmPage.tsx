import {
  Button,
  Description,
  Form,
  InputOTP,
  Label,
  REGEXP_ONLY_DIGITS,
  Surface,
} from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Block } from '../../../ui';
import { useConfirm } from './useConfirm';

export default function ConfirmPage() {
  const { t } = useTranslation();
  const { otp, timer, error, setOtp, handleConfirm, handleResend } = useConfirm();

  return (
    <Surface className='pt-24' variant='transparent'>
      <Form onSubmit={(e) => void handleConfirm(e)}>
        <Block className={'p-4'}>
          <div className='flex flex-col gap-4 items-center justify-center'>
            <h1 className='text-center text-2xl font-semibold text-foreground'>
              {t('confirm.title')}
            </h1>

            {error ? <Description className='text-center text-danger'>{error}</Description> : null}

            <div className='flex w-full max-w-xs flex-col gap-2'>
              <Label className='sr-only'>{t('a11y.otpCode')}</Label>
              <InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS} value={otp} onChange={setOtp}>
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

            <Button
              fullWidth
              className='max-w-xs'
              isDisabled={!otp || otp.length < 6}
              type='submit'
            >
              {t('confirm.submit')}
            </Button>
            <Button
              className='max-w-xs'
              isDisabled={timer > 0}
              variant='ghost'
              onPress={() => void handleResend()}
            >
              {timer > 0 ? t('confirm.resend_in', { timer }) : t('confirm.resend_otp')}
            </Button>
            <Description className='text-center text-xs'>{t('confirm.hint')}</Description>
          </div>
        </Block>
      </Form>
    </Surface>
  );
}
