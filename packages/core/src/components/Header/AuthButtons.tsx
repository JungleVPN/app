import { Button, Dropdown, Label } from '@heroui/react';
import { IconLogout, IconUser } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { useNavigation } from '../../hooks';
import { useSupabaseClient } from '../../runtime';
import { useAuthStoreActions, useAuthStoreInfo } from '../../stores';
import { isLandingPath } from '../../utils';

export function AuthButtons() {
  const supabase = useSupabaseClient();
  const { authUser, loading } = useAuthStoreInfo();
  const { setAuthUser, setRmnUser } = useAuthStoreActions();
  const navigate = useNavigation();
  const location = useLocation();
  const { t } = useTranslation();

  if (loading) {
    return null;
  }

  const handleLogin = () => {
    navigate('/login');
  };

  const handleTryNow = () => {
    navigate('/login');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setRmnUser(null);
    navigate('/');
  };

  const handleAction = async (key: string | number) => {
    if (key === 'profile') navigate('/profile/subscription');
    if (key === 'logout') await handleLogout();
  };

  if (authUser && !isLandingPath(location.pathname)) {
    return (
      <Dropdown>
        <Button isIconOnly size='md' variant='outline'>
          <IconUser stroke={2} />
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu onAction={handleAction}>
            <Dropdown.Item id='profile' textValue={t('header.profile')}>
              <div className='flex items-center gap-2'>
                <IconUser stroke={2} size={16} />
                <Label>{t('header.profile')}</Label>
              </div>
            </Dropdown.Item>
            <Dropdown.Item id='logout' textValue={t('header.logout')}>
              <div className='flex items-center gap-2'>
                <IconLogout stroke={2} size={16} />
                <Label>{t('header.logout')}</Label>
              </div>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    );
  }

  if (location.pathname.includes('login')) return null;

  return (
    <div className='flex items-center gap-2'>
      <Button variant={'tertiary'} onPress={handleLogin}>
        {t('header.login')}
      </Button>
      <Button className={'bg-linear-to-r from-violet-500 to-amber-400'} onPress={handleTryNow}>
        {t('header.cta')}
      </Button>
    </div>
  );
}
