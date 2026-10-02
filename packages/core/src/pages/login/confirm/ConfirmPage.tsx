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
import { Block, Container } from '../../../ui';
import { Heading } from '../../../ui/Heading';
import { useConfirm } from './useConfirm';

export default function ConfirmPage() {
  const { t } = useTranslation();
  const { otp, timer, error, loading, setOtp, handleConfirm, handleComplete,
    handleResend,
    handleChangeEmail, } =
    useConfirm();

  return (
    <Container maxWidth={'sm'}>
      <Surface className='pt-24' variant='transparent'>
        <Form onSubmit={(e) => void handleConfirm(e)}>
          <Block className={'p-4'}>
            <div className='flex flex-col gap-4 items-center justify-center'>
              <Heading className={'text-xl lg:text-2xl mb-2 text-center'}>
                {t('confirm.title')}
              </Heading>

              {error ? (
                <Description className='text-center text-danger'>{error}</Description>
              ) : null}

              <div className='flex w-full max-w-xs flex-col gap-2'>
                <Label className='sr-only'>{t('a11y.otpCode')}</Label>
                <InputOTP
                  autoComplete='one-time-code'
                  inputMode='numeric'
                  isDisabled={loading}
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  value={otp}
                  onChange={setOtp}
                  onComplete={handleComplete}
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

              <Button
                className='max-w-xs'
                isDisabled={timer > 0}
                variant='ghost'
                onPress={() => void handleResend()}
              >
                {timer > 0 ? t('confirm.resend_in', { timer }) : t('confirm.resend_otp')}
              </Button>
              <Button className='max-w-xs' variant='ghost' onPress={handleChangeEmail}>
                {t('confirm.change_email')}
              </Button>
              <Description className='text-center text-xs'>{t('confirm.hint')}</Description>
            </div>
          </Block>
        </Form>
      </Surface>
    </Container>
  );
}
