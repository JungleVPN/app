import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import Logo from '../../assets/Logo.svg';
import { usePlatformStore } from '../../stores';
import { AuthButtons } from './AuthButtons';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const { t } = useTranslation();
  const { platformType } = usePlatformStore();
  return (
    <div className='flex items-center justify-between'>
      <div>
        <Link to='/'>
          <img
            alt={t('header.logoAlt')}
            src={Logo}
            style={{
              width: '52px',
              height: '52px',
            }}
          />
        </Link>
      </div>

      <div className='flex items-center justify-between'>
        <LanguageSwitcher />
        {platformType === 'web' && <AuthButtons />}
      </div>
    </div>
  );
}
