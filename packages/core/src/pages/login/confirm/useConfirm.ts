import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useNavigation } from '../../../hooks';
import { useAppRoutes, useSupabaseClient } from '../../../runtime';
import {
  captureReferral,
  trackLoginEmailChanged,
  trackLoginOtpResendFailed,
  trackLoginOtpResent,
  trackLoginOtpVerified,
  trackLoginOtpVerifyFailed,
} from '../../../utils';

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

  useEffect(() => {
    captureReferral();
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((v) => v - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleComplete = async (code: string = otp) => {
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
      trackLoginOtpVerifyFailed(verifyError);
      setOtp('');
      setLoading(false);
    } else {
      trackLoginOtpVerified();
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
      trackLoginOtpResendFailed(resendError);
      setError(resendError.message);
    } else {
      trackLoginOtpResent();
    }

    setTimer(60);
  };

  const handleChangeEmail = () => {
    trackLoginEmailChanged();
    navigate('/login');
  };

  return {
    otp,
    setOtp,
    timer,
    error,
    loading,
    handleComplete,
    handleResend,
    handleChangeEmail,
  };
}
