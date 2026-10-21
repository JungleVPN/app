import { AlertDialog, Button, Spinner, useOverlayState } from '@heroui/react';
import type { SavedMethodDto } from '@workspace/types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../../../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../../../runtime';
import { useSavedMethodsStoreActions } from '../../../../stores';
import { Paragraph } from '../../../../ui';
import { detailRows, SubscriptionDetails } from './WhopSubscriptionCard';

type CancelState = 'idle' | 'canceling' | 'failed';

/**
 * The YooKassa subscription, shown like Whop's. Cancelling terminates the
 * saved method — the backend keeps its row — behind a confirmation, then a
 * popup says the plan must be paid for again. Only closing that popup moves
 * on: the billing store is refreshed (which drops the now-inactive plan, and
 * with it this card) and the user is sent to the plans page.
 */
export function YookassaSubscriptionCard({ method }: { method: SavedMethodDto }) {
  const { t, i18n } = useTranslation();
  const paymentsApi = usePaymentsApi();
  const navigate = useNavigation();
  const { profilePlansPath } = useAppRoutes();
  const { setYookassaMethods } = useSavedMethodsStoreActions();
  const confirm = useOverlayState();
  const cancelled = useOverlayState();
  const [state, setState] = useState<CancelState>('idle');

  const cancel = async () => {
    setState('canceling');
    try {
      await paymentsApi.deleteSavedMethod(method.id);
      setState('idle');
      cancelled.open();
    } catch {
      setState('failed');
    }
  };

  const finish = async () => {
    cancelled.close();
    setYookassaMethods(await paymentsApi.getYookassaSavedMethods());
    navigate(profilePlansPath);
  };

  const isCanceling = state === 'canceling';

  return (
    <>
      <SubscriptionDetails
        rows={detailRows(method, { t, language: i18n.language, canceled: false })}
      />
      <Button
        fullWidth
        size='lg'
        variant='danger-soft'
        isDisabled={isCanceling}
        isPending={isCanceling}
        onPress={confirm.open}
      >
        {({ isPending }) => (
          <>
            {isPending ? <Spinner color='current' size='sm' /> : null}
            {t('payment.yookassaCancel.button')}
          </>
        )}
      </Button>
      {state === 'failed' && <Paragraph>{t('payment.yookassaCancel.error')}</Paragraph>}
      <Paragraph>{t('payment.yookassaPayment.description')}</Paragraph>

      <AlertDialog.Backdrop
        isDismissable
        isOpen={confirm.isOpen}
        variant='blur'
        onOpenChange={confirm.setOpen}
      >
        <AlertDialog.Container size='sm'>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status='danger' />
              <AlertDialog.Heading>{t('payment.yookassaCancel.title')}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <Paragraph>{t('payment.yookassaCancel.body')}</Paragraph>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot='close' variant='tertiary'>
                {t('payment.yookassaCancel.keep')}
              </Button>
              <Button slot='close' variant='danger' onPress={cancel}>
                {t('payment.yookassaCancel.confirm')}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>

      <AlertDialog.Backdrop
        isDismissable={false}
        isOpen={cancelled.isOpen}
        variant='blur'
        onOpenChange={(open) => {
          if (!open) void finish();
        }}
      >
        <AlertDialog.Container size='sm'>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status='warning' />
              <AlertDialog.Heading>{t('payment.yookassaCancel.doneTitle')}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <Paragraph>{t('payment.yookassaCancel.doneBody')}</Paragraph>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot='close'>{t('payment.yookassaCancel.done')}</Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
