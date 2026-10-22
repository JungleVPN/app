import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import type { StepperNavigation } from './useStepperNavigation';

type StepperControlsProps = {
  navigation: StepperNavigation;
  previousLabel?: string;
  nextLabel?: string;
};

export function StepperControls({ navigation, previousLabel, nextLabel }: StepperControlsProps) {
  const { t } = useTranslation();
  const { isFirst, isValidating, goNext, goPrevious } = navigation;

  return (
    <div className='flex items-center justify-between gap-3'>
      {!isFirst && (
        <Button
          className='rounded-full'
          isDisabled={isValidating}
          variant='secondary'
          onPress={goPrevious}
        >
          {previousLabel ?? t('common.back')}
        </Button>
      )}
      <Button className='ms-auto rounded-full' isPending={isValidating} onPress={goNext}>
        {nextLabel ?? t('common.next')}
      </Button>
    </div>
  );
}
