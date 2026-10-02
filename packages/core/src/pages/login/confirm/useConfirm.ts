import { SyntheticEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useNavigation } from '../../../hooks';
import { useAppRoutes, useSupabaseClient } from '../../../runtime';
import { captureReferral, phCapture } from '../../../utils';

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
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

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

  // `code` is passed explicitly by the auto-submit path, where the `otp` state
  // may not have been committed yet.
  const handleConfirm = async (e?: SyntheticEvent, code: string = otp) => {
    e?.preventDefault();
    if (!code || !email || submittingRef.current) return;

    submittingRef.current = true;
    setError(null);
    setLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });

    submittingRef.current = false;
    if (verifyError) {
      setError(t('confirm.error_invalid_code'));
      phCapture('otp_invalid_code');
      setOtp('');
      setLoading(false);
    } else {
      phCapture('otp_verified');
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

  const handleChangeEmail = () => {
    const to = searchParams.get('to');
    navigate(to ? `/login?to=${encodeURIComponent(to)}` : '/login');
  };

  const handleComplete = (code: string) => void handleConfirm(undefined, code);

  return {
    otp,
    setOtp,
    timer,
    error,
    loading,
    handleConfirm,
    handleComplete,
    handleResend,
    handleChangeEmail,
  };
}
