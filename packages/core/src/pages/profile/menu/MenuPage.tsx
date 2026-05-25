import { Label, ListBox } from '@heroui/react';
import { IconChevronRight, IconCreditCardPay } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { TgsSticker } from '../../../components/payment/TgsSticker';
import { coreEnv } from '../../../env';
import { Block, Page } from '../../../ui';

export default function MenuPage() {
  const { t } = useTranslation();

  return (
    <Page
      icon={
        coreEnv.menuStickerUrl ? (
          <TgsSticker src={coreEnv.menuStickerUrl} className='mx-auto h-28 w-28' />
        ) : undefined
      }
      title={t('menu.pageTitle')}
      description={t('menu.pageDescription')}
    >
      <Block>
        <ListBox
          aria-label={t('menu.pageTitle')}
          selectionMode='none'
          className='w-full bg-default p-0'
        >
          <ListBox.Item
            id='transaction-history'
            textValue={t('menu.transactionHistory')}
            className='px-4 py-2 gap-1'
          >
            <span className='flex size-8 items-center justify-center rounded-xl bg-default-100'>
              <IconCreditCardPay stroke={2} />
            </span>
            <Label className='flex-1 cursor-pointer text-sm font-medium'>
              {t('menu.transactionHistory')}
            </Label>
            <IconChevronRight className='size-4 text-muted' stroke={2} />
          </ListBox.Item>
        </ListBox>
      </Block>
    </Page>
  );
}
