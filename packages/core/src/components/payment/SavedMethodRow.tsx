import { AlertDialog, Button, Chip, Separator, Tooltip, useOverlayState } from '@heroui/react';
import { IconTrash } from '@tabler/icons-react';
import type { SavedMethodDto } from '@workspace/types';
import { useTranslation } from 'react-i18next';
import { formatSavedMethodLabel, resolveMethodIcon } from '../../ui';

export interface SavedMethodRowProps {
  method: SavedMethodDto;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  showSeparatorAbove?: boolean;
}

export function SavedMethodRow({
  method,
  onDelete,
  isDeleting,
  showSeparatorAbove,
}: SavedMethodRowProps) {
  const { t } = useTranslation();
  const confirmState = useOverlayState();

  // Stripe subscriptions are managed via the Billing Portal, not deleted inline.
  const canDelete = Boolean(onDelete) && method.provider !== 'stripe';

  return (
    <>
      {showSeparatorAbove ? <Separator className='shrink-0' variant='secondary' /> : null}
      <div className='flex min-h-[52px] items-center gap-3 px-4 py-2.5'>
        <span aria-hidden className='shrink-0 text-xl leading-none w-6 h-6'>
          {resolveMethodIcon(method)}
        </span>

        <div className='min-w-0 flex-1'>
          <p className='text-sm font-medium leading-tight text-foreground'>
            {formatSavedMethodLabel(method)}
          </p>
          {method.card?.cardType ? (
            <Chip className='mt-1 w-fit' color='default' size='sm' variant='tertiary'>
              <Chip.Label>{method.card.cardType}</Chip.Label>
            </Chip>
          ) : null}
        </div>

        {canDelete ? (
          <Tooltip delay={0} closeDelay={0}>
            <Button
              aria-label={t('a11y.deletePaymentMethod')}
              isIconOnly
              isPending={isDeleting}
              size='sm'
              variant='tertiary'
              onPress={confirmState.open}
              className={'bg-[var(--quaternary-fill-background)]'}
            >
              <IconTrash />
            </Button>
            <Tooltip.Content placement='left' showArrow>
              <Tooltip.Arrow />
              <p className='text-sm'>{t('a11y.removeCard')}</p>
            </Tooltip.Content>
          </Tooltip>
        ) : null}
      </div>

      {/* Deletion confirmation dialog */}
      <AlertDialog.Backdrop
        isDismissable
        isOpen={confirmState.isOpen}
        variant='blur'
        onOpenChange={confirmState.setOpen}
      >
        <AlertDialog.Container size='sm'>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status='danger' />
              <AlertDialog.Heading>{t('payment.deleteMethod.title')}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p className='text-sm text-muted'>{t('payment.deleteMethod.body')}</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot='close' variant='tertiary'>
                {t('payment.deleteMethod.cancel')}
              </Button>
              <Button slot='close' variant='danger' onPress={() => onDelete?.(method.id)}>
                {t('payment.deleteMethod.confirm')}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
