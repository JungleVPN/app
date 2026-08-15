import { AlertDialog, Button, useOverlayState } from '@heroui/react';
import { IconCopy, IconLink } from '@tabler/icons-react';
import { useEffect } from 'react';
import { renderSVG } from 'uqr';
import { useClipboard, useTranslation } from '../../hooks';
import {
  useAuthStore,
  useNavbarStore,
  usePlatformStore,
  useSubscriptionInfoStoreInfo,
} from '../../stores';

export const SubscriptionLinkWidget = () => {
  const { t, baseTranslations } = useTranslation();
  const { subscription } = useSubscriptionInfoStoreInfo();
  const { clientPlatform } = usePlatformStore();
  const { setNavbarVisible } = useNavbarStore();
  const { authUser } = useAuthStore();
  const { copy, copied } = useClipboard({ timeout: 3000 });
  const qrState = useOverlayState();

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

  useEffect(() => {
    if (qrState.isOpen) {
      setNavbarVisible(false);
    } else {
      setNavbarVisible(true);
    }
  }, [setNavbarVisible, qrState.isOpen]);

  return (
    <>
      {authUser && (
        <Button isIconOnly size='md' variant='tertiary' onPress={qrState.open}>
          <IconLink />
        </Button>
      )}

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
              <AlertDialog.Heading>
                {baseTranslations ? t(baseTranslations.getLink) : ''}
              </AlertDialog.Heading>
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
                    {baseTranslations ? t(baseTranslations.scanQrCode) : ''}
                  </p>
                )}
                <p className='text-center text-sm text-muted'>
                  {baseTranslations ? t(baseTranslations.scanQrCodeDescription) : ''}
                </p>
              </div>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button fullWidth variant='secondary' onPress={handleCopy}>
                <IconCopy size={16} />
                {copied
                  ? baseTranslations
                    ? t(baseTranslations.linkCopied)
                    : 'Copied'
                  : baseTranslations
                    ? t(baseTranslations.copyLink)
                    : 'Copy link'}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
};
