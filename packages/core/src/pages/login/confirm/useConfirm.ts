import { SyntheticEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { useAppRoutes, useSupabaseClient } from '../../../runtime';

export function useConfirm() {
  const supabase = useSupabaseClient();
  const { profileSubscriptionPath } = useAppRoutes();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const email = searchParams.get('email');
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState<string | null>(null);

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
    } else {
      navigate(profileSubscriptionPath);
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
