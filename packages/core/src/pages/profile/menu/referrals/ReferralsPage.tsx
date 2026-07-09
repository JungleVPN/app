import { useTranslation } from 'react-i18next';
import { Page } from '../../../../ui';

export default function ReferralsPage() {
  const { t } = useTranslation();

  return <Page title={t('menu.referrals')} />;
}
