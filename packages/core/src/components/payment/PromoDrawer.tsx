import { Button, Drawer, Input, TextField } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { coreEnv, getTelegramStickerUrl } from '../../env';
import { TgsSticker } from '../../ui';

interface Props {
  isOpen: boolean;
  /** True while the underlying payment is being started. */
  isPending: boolean;
  onClose: () => void;
  /** Continue the payment flow with the entered promo code (empty string when none). */
  onContinue: (promoCode: string) => void | Promise<void>;
}

/**
 * Collects an optional promo code before payment. The promo input is local UI
 * state only — payment processing stays in the page's payment hooks; this drawer
 * just hands the trimmed code to `onContinue`.
 */
export function PromoDrawer({ isOpen, isPending, onClose, onContinue }: Props) {
  const { t } = useTranslation();
  const [promoCode, setPromoCode] = useState('');
  const promoStickerUrl = getTelegramStickerUrl(coreEnv.promoCodeStickerFileId);

  const handleClose = () => {
    setPromoCode('');
    onClose();
  };

  return (
    <Drawer.Backdrop
      isDismissable
      isOpen={isOpen}
      variant='blur'
      onOpenChange={(open) => !open && handleClose()}
    >
      <Drawer.Content placement='bottom'>
        <Drawer.Dialog style={{ maxWidth: '425px', margin: '0 auto' }}>
          <Drawer.Handle />
          <Drawer.CloseTrigger />
          <Drawer.Header className='flex flex-col items-center gap-3 pt-2'>
            {promoStickerUrl && <TgsSticker className='h-28 w-28' src={promoStickerUrl} />}
            <Drawer.Heading className='text-center'>{t('payment.promo.title')}</Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body className='flex flex-col gap-4'>
            <p className='text-center text-sm text-muted'>{t('payment.promo.subtitle')}</p>
            <TextField className='w-full' variant='secondary' name='promoCode'>
              <Input
                autoCapitalize='characters'
                className='w-full'
                placeholder={t('payment.promo.placeholder')}
                value={promoCode}
                variant='secondary'
                onChange={(e) => setPromoCode(e.target.value)}
              />
            </TextField>
          </Drawer.Body>
          <Drawer.Footer>
            <Button fullWidth isPending={isPending} onPress={() => onContinue(promoCode.trim())}>
              {t('payment.promo.continue')}
            </Button>
          </Drawer.Footer>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
