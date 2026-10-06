import { Drawer } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { coreEnv, getTelegramStickerUrl } from '../../env';
import { Container, Paragraph, TgsSticker } from '../../ui';

/**
 * Shown from the moment a wallet's token is being charged until our webhook
 * activates the subscription — which can take a while after the sheet closes.
 * It cannot be dismissed, so the payer is never left wondering whether to pay again.
 */
export function WhopPaymentProcessingDrawer({ isOpen }: { isOpen: boolean }) {
  const { t } = useTranslation();
  const stickerUrl = getTelegramStickerUrl(coreEnv.walletLoadingStickerFileId);

  return (
    <Drawer.Backdrop isDismissable={false} isOpen={isOpen} variant='blur'>
      <Drawer.Content placement='bottom'>
        <Container maxWidth={'sm'}>
          <Drawer.Dialog>
            <Drawer.Header className='flex flex-col items-center gap-3 pt-6'>
              {stickerUrl && <TgsSticker className='h-28 w-28' src={stickerUrl} />}
              <Drawer.Heading className='text-center'>
                {t('whopCheckout.processing.title')}
              </Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className='pb-6'>
              <Paragraph className='text-center'>
                {t('whopCheckout.processing.description')}
              </Paragraph>
            </Drawer.Body>
          </Drawer.Dialog>
        </Container>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
