import { Chip } from '@heroui/react';
import type { FunctionComponent, SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import BonusIcon from '../../assets/icons/bonus-icon.svg?react';
import BuyIcon from '../../assets/icons/buy-icon.svg?react';
import ShareIcon from '../../assets/icons/share-icon.svg?react';

type Step = {
  key: 'share' | 'subscribe' | 'reward';
  Icon: FunctionComponent<SVGProps<SVGSVGElement>>;
};

const STEPS: Step[] = [
  { key: 'share', Icon: ShareIcon },
  { key: 'subscribe', Icon: BuyIcon },
  { key: 'reward', Icon: BonusIcon },
];

export function HowItWorksSection() {
  const { t } = useTranslation();

  return (
    <section className='flex flex-col gap-12'>
      <div className='flex flex-col items-center gap-4 text-center'>
        <Chip
          color='default'
          variant='secondary'
          className='w-fit rounded-full bg-default-100 px-4 py-1 text-sm text-muted'
        >
          <Chip.Label>{t('referrals.howItWorks.badge')}</Chip.Label>
        </Chip>

        <h2 className='font-primary font-extrabold text-2xl md:text-4xl text-foreground'>
          {t('referrals.howItWorks.title')}
        </h2>

        <p className='max-w-2xl text-sm md:text-base text-muted'>
          {t('referrals.howItWorks.subtitle')}
        </p>
      </div>

      <ol className='flex flex-col gap-6'>
        {STEPS.map(({ key, Icon }, index) => {
          const artworkFirst = index % 2 === 1;

          return (
            <li key={key} className='grid gap-6 md:grid-cols-2'>
              <div
                className={`flex flex-col justify-center gap-3 rounded-4xl bg-[#f2ecfd] px-8 py-14 text-center ${
                  artworkFirst ? 'md:order-2' : ''
                }`}
              >
                <h3 className='font-primary font-bold text-xl md:text-2xl text-foreground'>
                  {t(`referrals.howItWorks.${key}.title`)}
                </h3>
                <p className='text-sm text-muted'>{t(`referrals.howItWorks.${key}.description`)}</p>
              </div>

              <div
                className={`flex items-center justify-center overflow-hidden rounded-4xl bg-background ${
                  artworkFirst ? 'md:order-1' : ''
                }`}
              >
                <Icon aria-hidden='true' focusable='false' className='h-64 w-64 md:h-88 md:w-88' />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
