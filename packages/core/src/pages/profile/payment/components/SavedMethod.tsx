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
}

export function SavedMethod({
  savedMethods,
  isLoadingMethods,
  isDeleting,
  onDelete,
}: SavedMethodProps) {
  const { t } = useTranslation();
  const { open: openTerms, isOpen: isTermsOpen } = useTermsStore();
  const { setNavbarVisible } = useNavbarStore();

  useEffect(() => {
    setNavbarVisible(!isTermsOpen);
  }, [setNavbarVisible, isTermsOpen]);

  const description = (
    <>
      {t('payment.savedMethodsDescription')}
      <p className='mt-3 text-start text-xs text-muted'>
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
    <Block title={t('payment.methodsHeading')} description={description} variant='secondary'>
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
