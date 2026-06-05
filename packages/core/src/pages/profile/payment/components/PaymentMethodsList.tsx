import { Spinner } from '@heroui/react';
import { SavedMethodRow } from '@workspace/core/components';
import type { SavedMethodDto } from '@workspace/types';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Block } from '../../../../ui';

interface PaymentMethodsListProps {
  savedMethods: SavedMethodDto[] | null;
  isLoadingMethods: boolean;
  isDeleting: boolean;
  onDelete: (id: string) => void;
}

export function PaymentMethodsList({
  savedMethods,
  isLoadingMethods,
  isDeleting,
  onDelete,
}: PaymentMethodsListProps) {
  const { t } = useTranslation();

  return (
    <Block
      title={t('payment.methodsHeading')}
      description={t('payment.savedMethodsDescription')}
      variant='secondary'
    >
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
    </Block>
  );
}
