import { Button, Drawer } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { coreEnv, getTelegramStickerUrl } from '../../env';
import { TgsSticker } from '../../ui/TgsSticker';

interface Props {
  isOpen: boolean;
  allowedPeriods: number;
  /** Overrides the default subscription success description when provided. */
  description?: string;
  onClose: () => void;
}

export function StarsPaymentSuccessDrawer({ isOpen, allowedPeriods, description, onClose }: Props) {
  const { t } = useTranslation();
  const successStickerUrl = getTelegramStickerUrl(coreEnv.successStickerFileId);

  return (
    <Drawer.Backdrop
      isDismissable
      isOpen={isOpen}
      variant='blur'
      onOpenChange={(open) => !open && onClose()}
    >
      <Drawer.Content placement='bottom'>
        <Drawer.Dialog>
          <Drawer.Handle />
          <Drawer.CloseTrigger />
          <Drawer.Header className='flex flex-col items-center gap-3 pt-2'>
            {successStickerUrl && <TgsSticker className='h-28 w-28' src={successStickerUrl} />}
            <Drawer.Heading className='text-center'>
              {t('payment.stars.success.title')}
            </Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body>
            <p className='text-center text-sm text-muted'>
              {description ?? t('payment.stars.success.description', { period: allowedPeriods })}
            </p>
          </Drawer.Body>
          <Drawer.Footer>
            <Button fullWidth slot='close' onPress={onClose}>
              {t('payment.stars.success.confirm')}
            </Button>
          </Drawer.Footer>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
