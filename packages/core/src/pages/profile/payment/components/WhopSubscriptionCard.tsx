import { AlertDialog, Button, Spinner, useOverlayState } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePaymentsApi } from '../../../../runtime';
import { Paragraph } from '../../../../ui/Paragraph';
import { formatDate } from '../../../../utils/format';

type CancelState =
  | { status: 'idle' }
  | { status: 'canceling' }
  | { status: 'canceled'; accessUntil: string | null }
  | { status: 'failed' };

/**
 * Whop's stand-in for the Stripe/Paddle "Manage subscription" button. Whop has
 * no customer portal to send the user to, so the one self-service action —
 * cancelling — happens here: behind a confirmation, at period end, so the
 * user keeps what they paid for.
 *
 * The end date shown is the cancel response's; the backend keeps reporting the
 * subscription active until Whop ends it, so it is not re-read on a reload.
 */
export function WhopSubscriptionCard() {
  const { t, i18n } = useTranslation();
  const paymentsApi = usePaymentsApi();
  const confirm = useOverlayState();
  const [state, setState] = useState<CancelState>({ status: 'idle' });

  const cancel = async () => {
    setState({ status: 'canceling' });
    try {
      const { accessUntil } = await paymentsApi.cancelWhopSubscription();
      setState({ status: 'canceled', accessUntil });
    } catch {
      setState({ status: 'failed' });
    }
  };

  if (state.status === 'canceled') {
    return (
      <Paragraph>
        {state.accessUntil
          ? t('payment.whopCancel.endsOn', {
              date: formatDate(state.accessUntil, i18n.language, { dateStyle: 'long' }),
            })
          : t('payment.whopCancel.canceled')}
      </Paragraph>
    );
  }

  const isCanceling = state.status === 'canceling';

  return (
    <>
      <Button
        fullWidth
        size='lg'
        variant='danger'
        isDisabled={isCanceling}
        isPending={isCanceling}
        onPress={confirm.open}
      >
        {({ isPending }) => (
          <>
            {isPending ? <Spinner color='current' size='sm' /> : null}
            {t('payment.whopCancel.button')}
          </>
        )}
      </Button>
      {state.status === 'failed' && <Paragraph>{t('payment.whopCancel.error')}</Paragraph>}

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
              <AlertDialog.Heading>{t('payment.whopCancel.title')}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <Paragraph>{t('payment.whopCancel.body')}</Paragraph>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot='close' variant='tertiary'>
                {t('payment.whopCancel.keep')}
              </Button>
              <Button slot='close' variant='danger' onPress={cancel}>
                {t('payment.whopCancel.confirm')}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
