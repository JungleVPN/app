import { Card, Spinner } from '@heroui/react';
import { SavedMethodRow } from '@workspace/core/components';
import type { SavedMethodDto } from '@workspace/types';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

interface PaymentMethodsListProps {
  savedMethods: SavedMethodDto[] | null;
  isLoadingMethods: boolean;
  isDeleting: boolean;
  onDelete: (id: string) => void;
  onTermsOpen: () => void;
}

export function PaymentMethodsList({
  savedMethods,
  isLoadingMethods,
  isDeleting,
  onDelete,
  onTermsOpen,
}: PaymentMethodsListProps) {
  const { t } = useTranslation();

  return (
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
                  onDelete={onDelete}
                />
              </Fragment>
            ))
          )}
        </Card.Content>
      </Card>

      <div className='mt-1 flex w-full flex-col gap-1 px-4 text-start'>
        <p className='text-xs text-muted'>
          {t('terms.paymentConsentLead')}
          <button
            type='button'
            className='cursor-pointer underline underline-offset-2'
            onClick={onTermsOpen}
          >
            {t('terms.paymentLinkLabel')}
          </button>
        </p>
      </div>
    </div>
  );
}
