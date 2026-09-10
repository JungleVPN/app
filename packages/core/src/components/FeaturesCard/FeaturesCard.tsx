import { Chip } from '@heroui/react';
import { IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Block } from '../../ui';

type TrialFeaturesCardProps = {
  badge?: string;
  title?: string;
  description?: string;
  className?: string;
};

export function FeaturesCard({
  badge,
  title,
  description,
  className = 'p-4',
}: TrialFeaturesCardProps) {
  const { t } = useTranslation();

  const features = [
    t('connectEmailPage.feature_devices'),
    t('connectEmailPage.feature_traffic'),
    t('connectEmailPage.feature_support'),
  ];

  return (
    <Block className={className} description={description}>
      <div className='flex flex-col gap-3'>
        {(badge || title) && (
          <div className='flex flex-col gap-1'>
            {badge && (
              <Chip color='success' size='sm' className={'w-fit'} variant='soft'>
                <Chip.Label>{badge}</Chip.Label>
              </Chip>
            )}
            {title && <p className='text-sm font-medium'>{title}</p>}
          </div>
        )}
        <div className='flex flex-col gap-2'>
          {features.map((feature) => (
            <div key={feature} className='flex items-center gap-2'>
              <div className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full'>
                <IconCheck size={12} stroke={3} />
              </div>
              <p className='text-sm '>{feature}</p>
            </div>
          ))}
        </div>
      </div>
    </Block>
  );
}
