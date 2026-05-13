import { AlertDialog, Button, Card, Spinner, useOverlayState } from '@heroui/react';
import { invoice, miniApp, openLink } from '@tma.js/sdk-react';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRemnawaveApi } from '../../../api';
import PaymentPageIcon from '../../../assets/icons/payment-icon.svg?url';
import { ExtendCard, Link, SavedMethodRow, StarsPaymentSuccessDrawer } from '../../../components';
import { coreEnv } from '../../../env';
import {
  useCreatePaymentSession,
  useCreateTelegramStarsInvoice,
  useDeleteSavedMethod,
  useUpdateUser,
} from '../../../hooks';
import { useAppRoutes, usePaymentsApi } from '../../../runtime';
import {
  useAuthStoreActions,
  useAuthStoreInfo,
  usePlatformStore,
  useSavedMethodsStoreActions,
  useSavedMethodsStoreInfo,
} from '../../../stores';
import { Page } from '../../../ui';

export default function PaymentPage() {
  const { platformType, clientPlatform } = usePlatformStore();
  const { allowedAmounts, allowedPeriods, starsAmount, supportUrl } = coreEnv;
  const { paymentReturnPath } = useAppRoutes();
  const paymentsApi = usePaymentsApi();
  const remnawaveApi = useRemnawaveApi();
  const { t } = useTranslation();
  const { rmnUser, tgUser } = useAuthStoreInfo();
  const { setRmnUser } = useAuthStoreActions();

  // Filled by ProfileLayout's useSavedMethodsData; refreshed here after delete.
  const savedMethods = useSavedMethodsStoreInfo();
  const { setSavedMethods } = useSavedMethodsStoreActions();
  const isLoadingMethods = savedMethods === null;

  const { isLoading: isPaying, execute: createSession } = useCreatePaymentSession(paymentsApi);
  const { isLoading: isStarsPaying, execute: createStarsInvoice } =
    useCreateTelegramStarsInvoice(paymentsApi);
  const { isLoading: isDeleting, execute: deleteMethod } = useDeleteSavedMethod(paymentsApi);
  const { execute: updateUser } = useUpdateUser(remnawaveApi);
  const termsState = useOverlayState();
  const successState = useOverlayState();
  const [starsError, setStarsError] = useState<string | null>(null);

  const hasActiveMethod = savedMethods?.some((m) => m.isActive) ?? false;
  const needsEmailInput = Boolean(tgUser) && !rmnUser?.email;

  // Only show Stars button inside TMA (not on web)
  const isTma = platformType !== 'web';
  const starsEnabled = isTma && starsAmount > 0;

  const handleDelete = async (id: string) => {
    if (!rmnUser?.uuid) return;
    await deleteMethod(rmnUser.uuid, id);
    const list = await paymentsApi.getSavedMethods(rmnUser.uuid);
    setSavedMethods(list);
  };

  const handleNavigate = (url: string) => {
    window.location.href = url;
  };

  const handleExtend = async (email?: string) => {
    if (!rmnUser) return;

    // The user we'll actually pay against — may be swapped to an existing web account below.
    let activeUser = rmnUser;

    if (email && !rmnUser.email) {
      // Look up whether there's already a web account with this email.
      const byEmail = await remnawaveApi.getUserByEmail({ email });
      const existingWebUser = byEmail?.[0];

      if (existingWebUser && existingWebUser.uuid !== rmnUser.uuid) {
        // This TMA user has a pre-existing web account. Link their Telegram ID to it
        // and adopt it so the payment goes against the right subscription.
        const linked = await updateUser({
          uuid: existingWebUser.uuid,
          telegramId: tgUser?.id != null ? Number(tgUser.id) : undefined,
        });
        if (linked) {
          setRmnUser(linked);
          activeUser = linked;
        }
      } else {
        // No conflicting account — just save the email on the current TMA user.
        const updated = await updateUser({ uuid: rmnUser.uuid, email });
        if (updated) {
          setRmnUser(updated);
          activeUser = updated;
        }
      }
    }

    const session = await createSession({
      userId: activeUser.uuid,
      save_payment_method: true,
      confirmation: {
        return_url:
          platformType === 'web' || (clientPlatform !== 'ios' && clientPlatform !== 'android')
            ? `${window.location.origin}${paymentReturnPath}`
            : import.meta.env.VITE_TMA_APP_URL,
        type: 'redirect',
      },
    });

    if (session?.url) {
      if (platformType === 'web' || (clientPlatform !== 'ios' && clientPlatform !== 'android')) {
        handleNavigate(session.url);
      } else {
        openLink(session.url);
        miniApp.close();
      }
    }
  };

  const handleStarsPayment = async () => {
    if (!rmnUser?.uuid) return;
    setStarsError(null);

    const result = await createStarsInvoice({
      userId: rmnUser.uuid,
      title: t('payment.stars.invoiceTitle', { period: allowedPeriods }),
      description: t('payment.stars.invoiceDescription', { period: allowedPeriods }),
    });

    if (!result?.invoiceLink) {
      setStarsError(t('payment.stars.errorFetch'));
      return;
    }

    try {
      const status = await invoice.openUrl(result.invoiceLink);
      if (status === 'paid') {
        successState.open();
      }
    } catch {
      // User dismissed the invoice or SDK not available — silently ignore.
    }
  };

  const starsButton = starsEnabled ? (
    <div className='flex w-full flex-col items-center gap-3'>
      <div className='flex w-full items-center gap-3 px-1'>
        <div className='h-px flex-1 bg-border' />
        <span className='text-xs text-muted'>{t('payment.stars.orDivider')}</span>
        <div className='h-px flex-1 bg-border' />
      </div>

      <Button fullWidth isDisabled={isStarsPaying} variant='secondary' onPress={handleStarsPayment}>
        {t('payment.stars.buttonLabel')}
      </Button>

      {starsError && <p className='text-xs text-danger'>{starsError}</p>}
    </div>
  ) : null;

  return (
    <Page
      icon={PaymentPageIcon}
      title={t('payment.pageTitle')}
      subtitle={t('payment.pageSubtitle')}
    >
      {hasActiveMethod ? (
        <>
          <div className='flex w-full flex-col gap-2'>
            <h2 className='px-4 text-xs font-semibold tracking-[0.06em] text-muted uppercase'>
              {t('payment.methodsHeading')}
            </h2>

            <Card className='w-full overflow-hidden p-0' variant='secondary'>
              <Card.Content className='flex flex-col gap-0 p-0'>
                {isLoadingMethods ? (
                  <div className='flex min-h-[120px] items-center justify-center py-8'>
                    <Spinner color='accent' size='sm' />
                  </div>
                ) : (
                  savedMethods?.map((method, index) => (
                    <Fragment key={method.id}>
                      <SavedMethodRow
                        isDeleting={isDeleting}
                        method={method}
                        showSeparatorAbove={index > 0}
                        onDelete={handleDelete}
                      />
                    </Fragment>
                  ))
                )}
              </Card.Content>
            </Card>
          </div>

          <div className='mt-1 flex w-full flex-col gap-1 px-4 text-start'>
            <p className='text-xs text-muted'>
              {t('terms.paymentConsentLead')}
              <button
                type='button'
                className='cursor-pointer underline underline-offset-2'
                onClick={termsState.open}
              >
                {t('terms.paymentLinkLabel')}
              </button>
            </p>
          </div>

          {starsButton}
        </>
      ) : (
        <>
          <ExtendCard
            allowedAmounts={allowedAmounts}
            isPaying={isPaying}
            showEmailInput={needsEmailInput}
            onExtend={handleExtend}
            onTermsOpen={termsState.open}
          />

          {starsButton}
        </>
      )}

      <StarsPaymentSuccessDrawer
        allowedPeriods={allowedPeriods}
        isOpen={successState.isOpen}
        onClose={successState.close}
      />

      <AlertDialog.Backdrop
        isDismissable
        isOpen={termsState.isOpen}
        variant='blur'
        onOpenChange={termsState.setOpen}
      >
        <AlertDialog.Container size='sm'>
          <AlertDialog.Dialog className={'bg-surface-secondary'}>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header className='mb-4'>
              <AlertDialog.Heading>{t('terms.dialog.title')}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <div className='flex flex-col gap-4 text-sm'>
                <div>
                  <p className='mb-1 font-semibold text-foreground'>
                    {t('terms.dialog.activationTitle')}
                  </p>
                  <p className='text-muted'>{t('terms.dialog.activationBody')}</p>
                </div>
                <div>
                  <p className='mb-1 font-semibold text-foreground'>
                    {t('terms.dialog.autoRenewalTitle')}
                  </p>
                  <p className='text-muted'>{t('terms.dialog.autoRenewalLead')}</p>
                </div>
                <div>
                  <p className='mb-1 font-semibold text-foreground'>
                    {t('terms.dialog.renewalCostTitle')}
                  </p>
                  <p className='text-muted'>
                    {t('terms.dialog.renewalCostLead')}
                    <Link
                      className='underline underline-offset-2'
                      href={supportUrl}
                      target={platformType === 'web' ? '_blank' : '_self'}
                      rel='noopener noreferrer'
                    >
                      {t('terms.dialog.supportLink')}
                    </Link>
                  </p>
                </div>
                <div>
                  <p className='mb-1 font-semibold text-foreground'>
                    {t('terms.dialog.agreementsTitle')}
                  </p>
                  <p className='text-muted'>
                    {t('terms.dialog.agreementsLead')}
                    <Link
                      className='underline underline-offset-2'
                      href='/terms'
                      onClick={() => termsState.setOpen(false)}
                    >
                      {t('terms.dialog.termsOfServiceLink')}
                    </Link>
                    {t('terms.dialog.agreementsTail')}
                  </p>
                </div>
              </div>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button fullWidth slot='close'>
                {t('terms.dialog.confirmButton')}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </Page>
  );
}
