import { AlertDialog, Button } from '@heroui/react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigation } from '../../hooks';
import { useAppRoutes } from '../../runtime';

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
  isLoggedIn,
  onClose,
}: {
  email: string | null;
  isLoggedIn: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigation();
  const { profileSubscriptionPath, authGateRedirectPath } = useAppRoutes();

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
            <AlertDialog.Heading>{t('getSubscription.active_dialog.title')}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <div className='flex flex-col gap-3 text-sm text-muted'>
              <p>
                <Trans
                  i18nKey='getSubscription.active_dialog.description'
                  values={{ email }}
                  components={{ 1: <span className='font-semibold text-foreground' /> }}
                />
              </p>
              <p>{t('getSubscription.active_dialog.hint')}</p>
            </div>
          </AlertDialog.Body>
          {isLoggedIn ? (
            <AlertDialog.Footer className='flex flex-col gap-2 sm:flex-row'>
              <Button fullWidth onPress={() => navigate(profileSubscriptionPath)}>
                {t('getSubscription.active_dialog.to_profile')}
              </Button>
            </AlertDialog.Footer>
          ) : (
            <AlertDialog.Footer className='flex flex-col gap-2 sm:flex-row'>
              <Button fullWidth onPress={() => navigate(authGateRedirectPath)}>
                {t('getSubscription.active_dialog.login')}
              </Button>
              <Button fullWidth variant='secondary' onPress={onClose}>
                {t('getSubscription.active_dialog.use_another_email')}
              </Button>
            </AlertDialog.Footer>
          )}
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
