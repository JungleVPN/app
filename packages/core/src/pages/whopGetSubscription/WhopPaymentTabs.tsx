import { Tabs } from '@heroui/react';
import { IconCreditCard } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import IconApplePay from '../../assets/icons/apple-pay-short-icon.svg?react';
import IconGooglePay from '../../assets/icons/google-pay-short-icon.svg?react';

type PaymentTab = { id: string; label?: string; icon: ReactNode };

const ICON_CLASS = 'h-12 w-auto';

/** Apple Pay is the native wallet on Safari and every iOS browser, where Google Pay is cut off. */
const isApplePayAvailable = (): boolean =>
  typeof window !== 'undefined' && 'ApplePaySession' in window;

/** Google Pay is offered wherever Apple Pay is not the native wallet. */
const isGooglePayAvailable = (): boolean => typeof window !== 'undefined' && !isApplePayAvailable();

function paymentTabs(cardLabel: string): PaymentTab[] {
  return [
    ...(!isApplePayAvailable()
      ? [{ id: 'apple_pay', icon: <IconApplePay className={ICON_CLASS} /> }]
      : []),
    ...(isGooglePayAvailable()
      ? [{ id: 'google_pay', icon: <IconGooglePay className={ICON_CLASS} /> }]
      : []),
    { id: 'card', label: cardLabel, icon: <IconCreditCard size={20} stroke={1.5} /> },
  ];
}

/** The payment methods to choose from; their content is not built yet. */
export function WhopPaymentTabs() {
  const { t } = useTranslation();
  const tabs = paymentTabs(t('getSubscription.card_tab'));

  return (
    <Tabs className='w-full' defaultSelectedKey={tabs[0]?.id}>
      <Tabs.ListContainer>
        <Tabs.List aria-label='Payment method'>
          {tabs.map(({ id, label, icon }) => (
            <Tabs.Tab key={id} id={id} className='flex items-center justify-center gap-2 py-5'>
              {icon}
              {label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
      {tabs.map(({ id }) => (
        <Tabs.Panel key={id} id={id}>
          {null}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
