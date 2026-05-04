import { Tabs } from '@heroui/react';
import { IconPigFilled, IconWallet } from '@tabler/icons-react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { useAppRoutes } from '../../runtime';
import css from './Tabs.module.css';

type TabValue = 'subscription' | 'payments';

interface TabDef {
  id: TabValue;
  label: string;
  icon: React.ReactNode;
}

const TAB_VALUES: TabValue[] = ['subscription', 'payments'];

function normalizePath(p: string) {
  if (p === '/') return '/';
  return p.replace(/\/$/, '');
}

function getActiveTab(pathname: string, subscriptionPath: string, paymentPath: string): TabValue {
  const norm = normalizePath(pathname) || '/';
  const pay = normalizePath(paymentPath);
  const sub = normalizePath(subscriptionPath);
  if (norm === pay) {
    return 'payments';
  }
  if (norm === sub || (sub === '/' && norm === '/')) {
    return 'subscription';
  }
  const segment = pathname.split('/').filter(Boolean).pop() as TabValue | undefined;
  return segment && TAB_VALUES.includes(segment) ? segment : 'subscription';
}

export const Navbar = () => {
  const { profileSubscriptionPath, profilePaymentPath } = useAppRoutes();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activeTab = getActiveTab(pathname, profileSubscriptionPath, profilePaymentPath);

  const tabPaths = useMemo(
    () =>
      ({
        subscription: profileSubscriptionPath,
        payments: profilePaymentPath,
      }) satisfies Record<TabValue, string>,
    [profileSubscriptionPath, profilePaymentPath],
  );

  const tabs = useMemo<TabDef[]>(
    () => [
      {
        id: 'subscription',
        label: t('profileTabs.subscription'),
        icon: <IconWallet className='size-6' />,
      },
      {
        id: 'payments',
        label: t('profileTabs.payment'),
        icon: <IconPigFilled className='size-6' />,
      },
    ],
    [t],
  );

  const handleSelectionChange = useCallback(
    (key: string | number | null) => {
      if (key != null && TAB_VALUES.includes(key as TabValue)) {
        navigate(tabPaths[key as TabValue]);
      }
    },
    [navigate, tabPaths],
  );

  return (
    <Tabs className={css.root} selectedKey={activeTab} onSelectionChange={handleSelectionChange}>
      <Tabs.ListContainer>
        <Tabs.List aria-label={t('profileTabs.ariaLabel')} className={css.list}>
          {tabs.map((tab) => (
            <Tabs.Tab key={tab.id} id={tab.id} className={css.tab}>
              <span className={css.tabIcon}>{tab.icon}</span>
              <span className={css.tabLabel}>{tab.label}</span>
              <Tabs.Indicator className={css.indicator} />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );
};
