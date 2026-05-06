import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { useSupabaseClient } from '../../runtime';
import { useAuthStoreActions, useAuthStoreInfo } from '../../stores';

export function AuthButtons() {
  const supabase = useSupabaseClient();
  const { authUser, loading } = useAuthStoreInfo();
  const { setAuthUser, setRmnUser } = useAuthStoreActions();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  if (loading) {
    return null;
  }

  const handleLogin = () => {
    navigate('/login');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setRmnUser(null);
    navigate('/');
  };

  if (authUser) {
    return (
      <div className='flex gap-2'>
        <Button variant='outline' onPress={handleLogout}>
          {t('header.logout')}
        </Button>
      </div>
    );
  }

  if (location.pathname.includes('login')) return null;

  return <Button onPress={handleLogin}>{t('header.login')}</Button>;
}
