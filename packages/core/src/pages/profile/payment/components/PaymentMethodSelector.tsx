import { Label, ListBox, type Selection } from '@heroui/react';
import { IconRotate } from '@tabler/icons-react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import MirIcon from '../../../../assets/icons/mir-icon.svg?react';
import SpbIcon from '../../../../assets/icons/spb-icon.svg?react';
import StarIcon from '../../../../assets/icons/telegram-star-icon.svg?react';
import { Block } from '../../../../ui';

export type PaymentMethod = 'card' | 'stars';

interface MethodDef {
  id: PaymentMethod;
  label: string;
  icons: ReactNode;
  trailing?: ReactNode;
}

const ITEM_CLASS = 'py-3 px-4 transition-colors data-[selected=true]:bg-accent/15';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  starsEnabled: boolean;
  onSelectionChange: (keys: Selection) => void;
  onTermsOpen: () => void;
}

export function PaymentMethodSelector({
  selectedMethod,
  starsEnabled,
  onSelectionChange,
  onTermsOpen,
}: PaymentMethodSelectorProps) {
  const { t } = useTranslation();

  const methods: MethodDef[] = [
    {
      id: 'card',
      label: t('payment.methodCard'),
      icons: (
        <div className='flex shrink-0 items-center gap-2'>
          <MirIcon className='size-6' aria-hidden='true' />
          <SpbIcon className='size-4' aria-hidden='true' />
        </div>
      ),
      trailing: <IconRotate size={18} stroke={1.5} className='ml-auto shrink-0 text-muted' />,
    },
    ...(starsEnabled
      ? [
          {
            id: 'stars' as PaymentMethod,
            label: t('payment.methodStars'),
            icons: (
              <div className='flex shrink-0 items-center gap-2'>
                <StarIcon className='size-4' aria-hidden='true' />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <Block
      title={t('payment.selectMethodHeading')}
      description={
        <>
          <span className='flex items-center gap-1.5'>
            <IconRotate size={16} />- {t('payment.autoRenewalHint')}
          </span>
          <p className='mt-3 text-start text-xs text-muted'>
            {t('terms.paymentConsentLead')}
            <button
              className='cursor-pointer underline underline-offset-2'
              type='button'
              onClick={onTermsOpen}
            >
              {t('terms.paymentLinkLabel')}
            </button>
          </p>
        </>
      }
    >
      <ListBox
        className='p-2'
        aria-label={t('payment.selectMethodHeading')}
        selectedKeys={new Set([selectedMethod])}
        selectionMode='single'
        onSelectionChange={onSelectionChange}
      >
        {methods.map(({ id, label, icons, trailing }) => (
          <ListBox.Item key={id} id={id} textValue={label} className={ITEM_CLASS}>
            <Label className='shrink-0 whitespace-nowrap'>{label}</Label>
            {icons}
            {trailing}
          </ListBox.Item>
        ))}
      </ListBox>
    </Block>
  );
}
