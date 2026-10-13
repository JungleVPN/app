import { Tabs } from '@heroui/react';
import { IconCreditCard } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import IconApplePay from '../../assets/icons/apple-pay-short-icon.svg?react';
import IconGooglePay from '../../assets/icons/google-pay-short-icon.svg?react';
import type { Wallet } from '../whopCheckout/whopWallets';

export type PaymentMethod = Wallet | 'card';

type PaymentTab = { id: PaymentMethod; label?: string; icon: ReactNode };

const ICON_CLASS = 'h-12 w-auto';

const WALLET_ICONS: Record<Wallet, ReactNode> = {
  apple_pay: <IconApplePay className={ICON_CLASS} />,
  google_pay: <IconGooglePay className={ICON_CLASS} />,
};

interface WhopPaymentTabsProps {
  /** The wallets this browser can pay with; the card is always offered. */
  wallets: Wallet[];
  selected: PaymentMethod;
  /** The card inputs, shown while the card tab is selected. */
  cardPanel?: ReactNode;
  onSelect: (method: PaymentMethod) => void;
}

/** The payment methods to choose from; the submit button acts on the selected one. */
export function WhopPaymentTabs({ wallets, selected, cardPanel, onSelect }: WhopPaymentTabsProps) {
  const { t } = useTranslation();
  const tabs: PaymentTab[] = [
    ...wallets.map((wallet) => ({ id: wallet, icon: WALLET_ICONS[wallet] })),
    {
      id: 'card',
      label: t('getSubscription.card_tab'),
      icon: <IconCreditCard size={20} stroke={1.5} />,
    },
  ];

  return (
    <Tabs
      className='w-full'
      selectedKey={selected}
      onSelectionChange={(key) => onSelect(key as PaymentMethod)}
    >
      <Tabs.ListContainer>
        <Tabs.List aria-label={t('getSubscription.payment_method_label')} className={'rounded-4xl'}>
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
        <Tabs.Panel key={id} id={id} className='pt-4'>
          {id === 'card' ? cardPanel : null}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
