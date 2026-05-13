import { Button, Drawer } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { coreEnv } from '../../env';

interface Props {
  isOpen: boolean;
  allowedPeriods: number;
  onClose: () => void;
}

export function StarsPaymentSuccessDrawer({ isOpen, allowedPeriods, onClose }: Props) {
  const { t } = useTranslation();
  const { successStickerUrl } = coreEnv;

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
            {successStickerUrl && (
              <img
                alt=''
                aria-hidden='true'
                className='h-28 w-28 object-contain'
                src={successStickerUrl}
              />
            )}
            <Drawer.Heading className='text-center'>
              {t('payment.stars.success.title')}
            </Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body>
            <p className='text-center text-sm text-muted'>
              {t('payment.stars.success.description', { period: allowedPeriods })}
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
