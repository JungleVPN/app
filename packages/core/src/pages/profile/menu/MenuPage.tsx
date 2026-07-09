import { Label, ListBox } from '@heroui/react';
import { IconChevronRight, IconCreditCardPay, IconUsers } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { coreEnv, getTelegramStickerUrl } from '../../../env';
import { useAppRoutes } from '../../../runtime';
import { Block, Page, TgsSticker } from '../../../ui';

export default function MenuPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profileTransactionsPath, profileReferralsPath } = useAppRoutes();

  return (
    <Page
      icon={
        coreEnv.menuStickerFileId ? (
          <TgsSticker
            src={getTelegramStickerUrl(coreEnv.menuStickerFileId)}
            className='mx-auto h-28 w-28'
          />
        ) : undefined
      }
      title={t('menu.pageTitle')}
      subtitle={t('menu.subtitle')}
    >
      <Block>
        <ListBox
          aria-label={t('menu.pageTitle')}
          selectionMode='none'
          className='w-full bg-default p-0'
          onAction={(key) => {
            if (key === 'transaction-history') void navigate(profileTransactionsPath);
            if (key === 'referrals') void navigate(profileReferralsPath);
          }}
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
          <ListBox.Item id='referrals' textValue={t('menu.referrals')} className='px-4 py-2 gap-1'>
            <span className='flex size-8 items-center justify-center rounded-xl bg-default-100'>
              <IconUsers stroke={2} />
            </span>
            <Label className='flex-1 cursor-pointer text-sm font-medium'>{t('menu.referrals')}</Label>
            <IconChevronRight className='size-4 text-muted' stroke={2} />
          </ListBox.Item>
        </ListBox>
      </Block>
    </Page>
  );
}
