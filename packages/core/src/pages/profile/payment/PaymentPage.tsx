import { AlertDialog, Button, Card, Spinner, useOverlayState } from '@heroui/react';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { useRemnawaveApi } from '../../../api';
import PaymentPageIcon from '../../../assets/icons/payment-icon.svg?url';
import { ExtendCard, Link, SavedMethodRow } from '../../../components';
import { useCreatePaymentSession, useDeleteSavedMethod, useUpdateUser } from '../../../hooks';
import { coreEnv } from '../../../env';
import { useAppRoutes, usePaymentsApi } from '../../../runtime';
import {
  useAuthStoreActions,
  useAuthStoreInfo,
  useSavedMethodsStoreActions,
  useSavedMethodsStoreInfo,
} from '../../../stores';
import { Page } from '../../../ui';

export default function PaymentPage() {
  const { allowedAmounts, allowedPeriods, supportUrl } = coreEnv;
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
  const { isLoading: isDeleting, execute: deleteMethod } = useDeleteSavedMethod(paymentsApi);
  const { execute: updateUser } = useUpdateUser(remnawaveApi);
  const termsState = useOverlayState();

  const hasActiveMethod = savedMethods?.some((m) => m.isActive) ?? false;
  const needsEmailInput = Boolean(tgUser) && !rmnUser?.email;

  const handleDelete = async (id: string) => {
    if (!rmnUser?.uuid) return;
    await deleteMethod(rmnUser.uuid, id);
    const list = await paymentsApi.getSavedMethods(rmnUser.uuid);
    setSavedMethods(list);
  };

  const handleExtend = async (email?: string) => {
    if (!rmnUser) return;

    if (email && !rmnUser.email) {
      const updated = await updateUser({ uuid: rmnUser.uuid, email });
      if (updated) setRmnUser(updated);
    }

    const session = await createSession({
      userId: rmnUser.uuid,
      selectedPeriod: allowedPeriods,
      save_payment_method: true,
      amount: { value: allowedAmounts, currency: 'RUB' },
      confirmation: {
        return_url: `${window.location.origin}${paymentReturnPath}`,
        type: 'redirect',
      },
    });

    if (session?.url) {
      window.location.href = session.url;
    }
  };

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

            <Card className='w-full overflow-hidden p-0' variant='default'>
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
        </>
      ) : (
        <ExtendCard
          allowedAmounts={allowedAmounts}
          isPaying={isPaying}
          showEmailInput={needsEmailInput}
          onExtend={handleExtend}
          onTermsOpen={termsState.open}
        />
      )}

      <AlertDialog.Backdrop
        isDismissable
        isOpen={termsState.isOpen}
        variant='blur'
        onOpenChange={termsState.setOpen}
      >
        <AlertDialog.Container size='sm'>
          <AlertDialog.Dialog>
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
                    {supportUrl ? (
                      <Link
                        className='underline underline-offset-2'
                        href={supportUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        {t('terms.dialog.supportLink')}
                      </Link>
                    ) : (
                      <span>{t('terms.dialog.supportLink')}</span>
                    )}
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
