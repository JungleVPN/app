import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { useNavigation } from '../../../../hooks';
import { useAppRoutes, useSupabaseClient } from '../../../../runtime';
import {
  captureReferral,
  trackLoginEmailChanged,
  trackLoginOtpResendFailed,
  trackLoginOtpResent,
  trackLoginOtpVerified,
  trackLoginOtpVerifyFailed,
} from '../../../../utils';

export const OTP_LENGTH = 6;

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
    if (!email) navigate('/login', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((v) => v - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const verify = async (code: string) => {
    if (code.length !== OTP_LENGTH || !email || submittingRef.current) return;

    submittingRef.current = true;
    setError(null);
    setLoading(true);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });

      if (verifyError) {
        setError(t('confirm.error_invalid_code'));
        trackLoginOtpVerifyFailed(verifyError);
        setOtp('');
        return;
      }

      trackLoginOtpVerified();
      const to = searchParams.get('to');
      navigate(to ?? profileSubscriptionPath);
    } catch {
      setError(t('errors.unknown'));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleOtpChange = (code: string) => {
    setOtp(code);
    void verify(code);
  };

  const handleSubmit = () => verify(otp);

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
    timer,
    error,
    loading,
    handleOtpChange,
    handleSubmit,
    handleResend,
    handleChangeEmail,
  };
}
