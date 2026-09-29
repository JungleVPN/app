import { AlertDialog, Button, Chip, Separator, Spinner, useOverlayState } from '@heroui/react';
import type { SavedMethodDto } from '@workspace/types';
import type { TFunction } from 'i18next';
import { Fragment, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePaymentsApi } from '../../../../runtime';
import { Block, Paragraph } from '../../../../ui';
import { formatAmount } from '../../../../utils/currency';
import { formatDate } from '../../../../utils/format';
import { formatPeriod } from '../../../../utils/planPricing';

type CancelState =
  | { status: 'idle' }
  | { status: 'canceling' }
  | { status: 'canceled'; accessUntil: string | null; resume: 'idle' | 'resuming' | 'failed' }
  | { status: 'failed' };

type DetailRow = { label: string; value: ReactNode };

/** Colored like the button that changes it: green like Resume, red like Cancel. */
function StatusChip({ canceled, t }: { canceled: boolean; t: TFunction }) {
  return (
    <Chip color={canceled ? 'danger' : 'success'} size='sm' variant='soft'>
      <Chip.Label>
        {t(canceled ? 'payment.whopSubscription.canceled' : 'payment.whopSubscription.active')}
      </Chip.Label>
    </Chip>
  );
}

/**
 * The subscription as the latest Whop charge described it. A row the webhook
 * has not recorded yet (a membership that has not renewed since the fields
 * were added) is left out rather than shown empty.
 */
function detailRows(
  method: SavedMethodDto,
  options: { t: TFunction; language: string; canceled: boolean },
): DetailRow[] {
  const { t, language, canceled } = options;
  const price =
    method.amount != null && method.currency ? formatAmount(method.amount, method.currency) : null;
  const paymentMethod = method.card?.last4 ? `•••• ${method.card.last4}` : method.title;

  const rows: (DetailRow | null)[] = [
    method.productName
      ? { label: t('payment.whopSubscription.product'), value: method.productName }
      : null,
    price
      ? {
          label: t('payment.whopSubscription.price'),
          value: method.billingPeriod
            ? t('payment.whopSubscription.pricePerPeriod', {
                price,
                period: formatPeriod(method.billingPeriod, t),
              })
            : price,
        }
      : null,
    {
      label: t('payment.whopSubscription.status'),
      value: <StatusChip canceled={canceled} t={t} />,
    },
    !canceled && method.renewsAt
      ? {
          label: t('payment.whopSubscription.nextPayment'),
          value: formatDate(method.renewsAt, language, { dateStyle: 'long' }),
        }
      : null,
    paymentMethod
      ? { label: t('payment.whopSubscription.paymentMethod'), value: paymentMethod }
      : null,
  ];
  return rows.filter((row): row is DetailRow => row !== null);
}

function SubscriptionDetails({ rows }: { rows: DetailRow[] }) {
  if (rows.length === 0) return null;
  return (
    <Block>
      <dl>
        {rows.map((row, index) => (
          <Fragment key={row.label}>
            {index > 0 ? <Separator className='shrink-0' variant='secondary' /> : null}
            <div className='flex min-h-13 items-center justify-between gap-3 px-4 py-2.5'>
              <dt className='text-sm text-muted'>{row.label}</dt>
              <dd className='text-end text-sm'>{row.value}</dd>
            </div>
          </Fragment>
        ))}
      </dl>
    </Block>
  );
}

/**
 * Whop's stand-in for the Stripe/Paddle "Manage subscription" button. Whop has
 * no customer portal to send the user to, so its self-service actions happen
 * here: cancelling — behind a confirmation, at period end, so the user keeps
 * what they paid for — and resuming a cancelled one before that period ends.
 *
 * Right after cancelling, the end date shown is the cancel response's. On a
 * reload it comes from the saved method: the backend marks it `canceled` and
 * keeps reporting it until Whop ends it, access running until `renewsAt`.
 */
export function WhopSubscriptionCard({ method }: { method?: SavedMethodDto }) {
  const { t, i18n } = useTranslation();
  const paymentsApi = usePaymentsApi();
  const confirm = useOverlayState();
  const [state, setState] = useState<CancelState>(() =>
    method?.status === 'canceled'
      ? { status: 'canceled', accessUntil: method.renewsAt, resume: 'idle' }
      : { status: 'idle' },
  );

  const cancel = async () => {
    setState({ status: 'canceling' });
    try {
      const { accessUntil } = await paymentsApi.cancelWhopSubscription();
      setState({ status: 'canceled', accessUntil, resume: 'idle' });
    } catch {
      setState({ status: 'failed' });
    }
  };

  const resume = async (accessUntil: string | null) => {
    setState({ status: 'canceled', accessUntil, resume: 'resuming' });
    try {
      await paymentsApi.resumeWhopSubscription();
      setState({ status: 'idle' });
    } catch {
      setState({ status: 'canceled', accessUntil, resume: 'failed' });
    }
  };

  const details = method ? (
    <SubscriptionDetails
      rows={detailRows(method, {
        t,
        language: i18n.language,
        canceled: state.status === 'canceled',
      })}
    />
  ) : null;

  if (state.status === 'canceled') {
    const isResuming = state.resume === 'resuming';
    return (
      <>
        {details}
        <Button
          fullWidth
          size='lg'
          className='[--button-bg-hover:var(--color-success-soft-hover)] [--button-bg-pressed:var(--color-success-soft-hover)] [--button-bg:var(--color-success-soft)] [--button-fg:var(--color-success-soft-foreground)]'
          isDisabled={isResuming}
          isPending={isResuming}
          onPress={() => resume(state.accessUntil)}
        >
          {({ isPending }) => (
            <>
              {isPending ? <Spinner color='current' size='sm' /> : null}
              {t('payment.whopResume.button')}
            </>
          )}
        </Button>
        {state.resume === 'failed' && <Paragraph>{t('payment.whopResume.error')}</Paragraph>}
        <Paragraph className={'ml-4'}>
          {state.accessUntil
            ? t('payment.whopCancel.endsOn', {
                date: formatDate(state.accessUntil, i18n.language, { dateStyle: 'long' }),
              })
            : t('payment.whopCancel.canceled')}
        </Paragraph>
      </>
    );
  }

  const isCanceling = state.status === 'canceling';

  return (
    <>
      {details}
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
