import { Spinner } from '@heroui/react';
import { SavedMethodRow } from '@workspace/core/components';
import type { SavedMethodDto } from '@workspace/types';
import { Fragment, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavbarStore, useTermsStore } from '../../../../stores';
import { Block } from '../../../../ui';

interface SavedMethodProps {
  savedMethods: SavedMethodDto[] | null;
  isLoadingMethods: boolean;
  isDeleting?: boolean;
  onDelete?: (id: string) => void;
  hasStripeSubscription?: boolean;
}

export function SavedMethod({
  savedMethods,
  isLoadingMethods,
  isDeleting,
  onDelete,
  hasStripeSubscription,
}: SavedMethodProps) {
  const { t } = useTranslation();
  const { open: openTerms, isOpen: isTermsOpen } = useTermsStore();
  const { setNavbarVisible } = useNavbarStore();

  useEffect(() => {
    setNavbarVisible(!isTermsOpen);
  }, [setNavbarVisible, isTermsOpen]);

  const description = (
    <>
      {!hasStripeSubscription && (
        <span className={'mb-3'}>{t('payment.savedMethodsDescription')}</span>
      )}
      <p className='text-start text-xs text-muted'>
        {t('terms.paymentConsentLead')}
        <button
          className='cursor-pointer underline underline-offset-2'
          type='button'
          onClick={openTerms}
        >
          {t('terms.paymentLinkLabel')}
        </button>
      </p>
    </>
  );

  return (
    <Block
      title={!hasStripeSubscription ? t('payment.methodsHeading') : undefined}
      description={description}
      variant='secondary'
    >
      {isLoadingMethods ? (
        <div className='flex min-h-30 items-center justify-center py-8'>
          <Spinner color='accent' size='sm' />
        </div>
      ) : (
        !hasStripeSubscription &&
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
