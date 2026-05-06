import {
  Button,
  Description,
  Form,
  InputOTP,
  Label,
  REGEXP_ONLY_DIGITS,
  Surface,
} from '@heroui/react';
import { type FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { useAppRoutes, useSupabaseClient } from '../../../runtime';
import { Block } from '../../../ui';

export default function ConfirmPage() {
  const supabase = useSupabaseClient();
  const { subscriptionPortalPath } = useAppRoutes();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((v) => v - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault();
    if (!otp || !email) return;

    setError(null);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (verifyError) {
      setError(t('confirm.error_invalid_code'));
    } else {
      navigate(subscriptionPortalPath);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    if (!email) return;

    const { error: resendError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });

    if (resendError) {
      setError(resendError.message);
    }

    setTimer(60);
  };

  return (
    <Surface className='mx-auto w-fit max-w-md pt-24' variant='transparent'>
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          void handleConfirm(e);
        }}
      >
        <Block>
          <div className='flex flex-col gap-4'>
            <h1 className='text-center text-2xl font-semibold text-foreground'>
              {t('confirm.title')}
            </h1>

            {error ? <Description className='text-center text-danger'>{error}</Description> : null}

            <div className='mx-auto flex w-full max-w-xs flex-col gap-2'>
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
              className='mx-auto max-w-xs'
              isDisabled={!otp || otp.length < 6}
              type='submit'
            >
              {t('confirm.submit')}
            </Button>
            <Button
              className='mx-auto max-w-xs text-accent'
              isDisabled={timer > 0}
              variant='ghost'
              onPress={() => void handleResend()}
            >
              {timer > 0 ? t('confirm.resend_in', { timer }) : t('confirm.resend_otp')}
            </Button>
            <Description className='text-center text-xs text-muted'>
              {t('confirm.hint')}
            </Description>
          </div>
        </Block>
      </Form>
    </Surface>
  );
}
