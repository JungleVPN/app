import { AlertDialog, Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Paragraph } from '../../../../ui/Paragraph';

interface DeviceDeleteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeviceDeleteDialog({ isOpen, onOpenChange, onConfirm }: DeviceDeleteDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog.Backdrop isDismissable isOpen={isOpen} variant='blur' onOpenChange={onOpenChange}>
      <AlertDialog.Container size='sm'>
        <AlertDialog.Dialog>
          <AlertDialog.Header>
            <AlertDialog.Icon status='danger' />
            <AlertDialog.Heading>{t('devices.deleteDevice.title')}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <Paragraph>{t('devices.deleteDevice.body')}</Paragraph>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button slot='close' variant='tertiary'>
              {t('devices.deleteDevice.cancel')}
            </Button>
            <Button slot='close' variant='danger' onPress={onConfirm}>
              {t('devices.deleteDevice.confirm')}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
