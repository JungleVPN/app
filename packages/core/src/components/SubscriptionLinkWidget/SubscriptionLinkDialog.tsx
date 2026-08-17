import { Button } from '@heroui/react';
import { AlertDialog } from '@heroui/react/alert-dialog';
import { IconCopy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { renderSVG } from 'uqr';
import { useClipboard } from '../../hooks';
import {
  usePlatformStore,
  useSubscriptionInfoStore,
  useSubscriptionLinkDialogStore,
} from '../../stores';

export const SubscriptionLinkDialog = () => {
  const qrState = useSubscriptionLinkDialogStore();
  const { t } = useTranslation();
  const subscription = useSubscriptionInfoStore((state) => state.subscription);
  const { copy, copied } = useClipboard({ timeout: 3000 });
  const { clientPlatform } = usePlatformStore();

  const isDesktop = clientPlatform !== 'ios' && clientPlatform !== 'android';

  const accentColor =
    getComputedStyle(document.documentElement)
      .getPropertyValue('--tg-theme-accent-text-color')
      .trim() || '#22d3ee';

  const qrCodeSvg =
    subscription &&
    renderSVG(subscription.subscriptionUrl, {
      whiteColor: '#161B22',
      blackColor: accentColor,
    });

  const handleCopy = async () => {
    await copy(subscription?.subscriptionUrl || '');
  };

  return (
    <AlertDialog.Backdrop
      isDismissable
      isOpen={qrState.isOpen}
      variant='blur'
      onOpenChange={qrState.setOpen}
    >
      <AlertDialog.Container size='sm'>
        <AlertDialog.Dialog>
          <AlertDialog.CloseTrigger />
          <AlertDialog.Header>
            <AlertDialog.Heading>{t('subscriptionLinkWidget.getLink')}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <div className='flex flex-col items-center gap-4'>
              {qrCodeSvg && (
                <img
                  src={`data:image/svg+xml;utf8,${encodeURIComponent(qrCodeSvg)}`}
                  alt='QR code'
                  className='w-56 h-56 rounded-xl'
                />
              )}
              {isDesktop && (
                <p className='text-center text-base font-semibold'>
                  {t('subscriptionLinkWidget.scanQrCode')}
                </p>
              )}

              <div className='w-full'>
                <p className='mb-1 text-sm font-semibold text-foreground'>
                  {t('subscriptionLinkWidget.addToDeviceTitle')}
                </p>
                <ol className='list-decimal list-inside text-sm text-muted flex flex-col gap-1'>
                  <li>{t('subscriptionLinkWidget.addToDeviceSteps.step1')}</li>
                  <li>{t('subscriptionLinkWidget.addToDeviceSteps.step2')}</li>
                </ol>
              </div>
            </div>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button fullWidth variant='secondary' onPress={handleCopy}>
              <IconCopy size={16} />
              {copied
                ? t('subscriptionLinkWidget.linkCopied')
                : t('subscriptionLinkWidget.copyLink')}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
};
