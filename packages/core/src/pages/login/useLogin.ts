import { type SyntheticEvent, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useNavigation } from '../../hooks';
import { useSupabaseClient } from '../../runtime';

export function useLogin() {
  const supabase = useSupabaseClient();
  const navigate = useNavigation();
  const [searchParams] = useSearchParams();

  const message = searchParams.get('message');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    navigate(`/login/confirm?email=${encodeURIComponent(email)}&message=Enter OTP`);
  };

  return { email, setEmail, loading, error, message, handleSubmit };
}
