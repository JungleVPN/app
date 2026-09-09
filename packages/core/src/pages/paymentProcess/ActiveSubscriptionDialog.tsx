import { AlertDialog, Button } from '@heroui/react';

/**
 * Shown when the payer email on the anonymous checkout already has an active
 * subscription.
 *
 * The backend refuses to open a session for it — an unauthenticated caller has
 * proved nothing but knowledge of the address, so it is never handed the
 * subscriber's Billing Portal. The visitor is sent to log in instead, where the
 * profile shows the subscription that already exists.
 *
 * `email` doubles as the open state: there is nothing to say without it.
 */
export function ActiveSubscriptionDialog({
  email,
  onClose,
  onLogin,
}: {
  email: string | null;
  onClose: () => void;
  onLogin: () => void;
}) {
  return (
    <AlertDialog.Backdrop
      isDismissable
      isOpen={email !== null}
      variant='blur'
      onOpenChange={(isOpen: boolean) => {
        if (!isOpen) onClose();
      }}
    >
      <AlertDialog.Container size='sm'>
        <AlertDialog.Dialog className='bg-surface-secondary'>
          <AlertDialog.CloseTrigger />
          <AlertDialog.Header className='mb-4'>
            <AlertDialog.Heading>You already have a subscription</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <div className='flex flex-col gap-3 text-sm text-muted'>
              <p>
                <span className='font-semibold text-foreground'>{email}</span> already has an active
                JungleVPN subscription, so there is nothing to buy here.
              </p>
              <p>Log in to see your plan, invoices and payment method.</p>
            </div>
          </AlertDialog.Body>
          <AlertDialog.Footer className='flex flex-col gap-2 sm:flex-row'>
            <Button fullWidth onPress={onLogin}>
              Log in
            </Button>
            <Button fullWidth variant='secondary' onPress={onClose}>
              Use a different email
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
