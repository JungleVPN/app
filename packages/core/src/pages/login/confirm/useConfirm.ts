import { SyntheticEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useNavigation } from '../../../hooks';
import { useAppRoutes, useSupabaseClient } from '../../../runtime';
import { captureReferral, phCapture, trackLoginConversion } from '../../../utils';

export function useConfirm() {
  const supabase = useSupabaseClient();
  const { profileSubscriptionPath } = useAppRoutes();
  const [searchParams] = useSearchParams();
  const navigate = useNavigation();
  const { t } = useTranslation();

  const email = searchParams.get('email');
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState<string | null>(null);

  // Re-capture here too: `ref` was forwarded onto this URL by useLogin(), so
  // pick it up in case the original localStorage write didn't survive the hop.
  useEffect(() => {
    captureReferral();
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((v) => v - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleConfirm = async (e: SyntheticEvent) => {
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
      phCapture('otp_invalid_code');
    } else {
      phCapture('otp_verified');
      trackLoginConversion();
      const to = searchParams.get('to');
      navigate(to ?? profileSubscriptionPath);
    }
  };

  const handleResend = async () => {
    if (timer > 0 || !email) return;

    const { error: resendError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (resendError) {
      setError(resendError.message);
    }

    setTimer(60);
  };

  return { otp, setOtp, timer, error, handleConfirm, handleResend };
}
