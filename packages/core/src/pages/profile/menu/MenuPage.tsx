import { Label, ListBox } from '@heroui/react';
import {
  IconChevronRight,
  IconCreditCardPay,
  // IconMoneybagMoveBack,
  IconUsers,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { coreEnv, getTelegramStickerUrl } from '../../../env';
import { useNavigation } from '../../../hooks';
import { useAppRoutes } from '../../../runtime';
import { Block, Page, TgsSticker } from '../../../ui';

export default function MenuPage() {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const { profileTransactionsPath, profileReferralsPath, affiliatesPath } = useAppRoutes();

  return (
    <Page
      icon={
        coreEnv.menuStickerFileId ? (
          <TgsSticker
            src={getTelegramStickerUrl(coreEnv.menuStickerFileId)}
            className='h-28 w-28'
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
          className='w-full p-0'
          onAction={(key) => {
            if (key === 'transaction-history') void navigate(profileTransactionsPath);
            if (key === 'referrals') void navigate(profileReferralsPath);
            if (key === 'affiliates') void navigate(affiliatesPath);
          }}
        >
          <ListBox.Item
            id='transaction-history'
            textValue={t('menu.transactionHistory')}
            className='px-4 py-2 gap-1'
          >
            <span className='flex size-8 items-center justify-center rounded-xl'>
              <IconCreditCardPay stroke={2} />
            </span>
            <Label className='flex-1 cursor-pointer text-sm font-medium'>
              {t('menu.transactionHistory')}
            </Label>
            <IconChevronRight className='size-4 text-muted' stroke={2} />
          </ListBox.Item>
          <ListBox.Item id='referrals' textValue={t('menu.referrals')} className='px-4 py-2 gap-1'>
            <span className='flex size-8 items-center justify-center rounded-xl'>
              <IconUsers stroke={2} />
            </span>
            <Label className='flex-1 cursor-pointer text-sm font-medium'>
              {t('menu.referrals')}
            </Label>
            <IconChevronRight className='size-4 text-muted' stroke={2} />
          </ListBox.Item>
          {/*<ListBox.Item*/}
          {/*  id='affiliates'*/}
          {/*  textValue={t('menu.affiliates')}*/}
          {/*  className='px-4 py-2 gap-1'*/}
          {/*>*/}
          {/*  <span className='flex size-8 items-center justify-center rounded-xl bg-default-100'>*/}
          {/*    <IconMoneybagMoveBack stroke={2} />*/}
          {/*  </span>*/}
          {/*  <Label className='flex-1 cursor-pointer text-sm font-medium'>*/}
          {/*    {t('menu.affiliates')}*/}
          {/*  </Label>*/}
          {/*  <IconChevronRight className='size-4 text-muted' stroke={2} />*/}
          {/*</ListBox.Item>*/}
        </ListBox>
      </Block>
    </Page>
  );
}
