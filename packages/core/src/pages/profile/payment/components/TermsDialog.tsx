import { AlertDialog, Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { Link, SupportPopover } from '../../../../components';
import { useTermsStore } from '../../../../stores';

export function TermsDialog() {
  const { t } = useTranslation();
  const { isOpen, setOpen, close } = useTermsStore();

  return (
    <AlertDialog.Backdrop isDismissable isOpen={isOpen} variant='blur' onOpenChange={setOpen}>
      <AlertDialog.Container size='sm'>
        <AlertDialog.Dialog className='bg-surface-secondary'>
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
                  <SupportPopover
                    trigger={
                      <Button
                        variant='tertiary'
                        className='h-auto min-w-0 bg-transparent p-0 text-sm text-muted underline underline-offset-2'
                      >
                        {t('terms.dialog.supportLink')}
                      </Button>
                    }
                  />
                </p>
              </div>
              <div>
                <p className='mb-1 font-semibold text-foreground'>
                  {t('terms.dialog.agreementsTitle')}
                </p>
                <p className='text-muted'>
                  {t('terms.dialog.agreementsLead')}
                  <Link className='underline underline-offset-2' href='/terms' onClick={close}>
                    {t('terms.dialog.termsOfServiceLink')}
                  </Link>
                  {t('terms.dialog.agreementsMid')}
                  <Link
                    className='underline underline-offset-2'
                    href='/privacy'
                    onClick={close}
                  >
                    {t('terms.dialog.privacyPolicyLink')}
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
  );
}
