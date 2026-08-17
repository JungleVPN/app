import { Chip } from '@heroui/react';
import { IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import privacy from '../../assets/lottie/privacy.lottie?url';
import privacy_dark from '../../assets/lottie/privacy_dark.lottie?url';
import { useTheme } from '../../hooks';
import { LottieIcon } from '../../ui';

type Row = {
  feature: string;
  ours: string;
  theirs: string;
};

const ROW_KEYS = ['traffic', 'devices', 'support', 'privacy', 'advertising'] as const;

export function ComparisonSection() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const rows: Row[] = ROW_KEYS.map((key) => ({
    feature: t(`landing.comparison.rows.${key}.feature`),
    ours: t(`landing.comparison.rows.${key}.ours`),
    theirs: t(`landing.comparison.rows.${key}.theirs`),
  }));

  return (
    <section>
      <div className='mb-16 flex flex-col-reverse items-start gap-8 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex max-w-xl flex-col items-start gap-3 text-start'>
          <Chip color='default' variant='secondary' className='w-fit'>
            <Chip.Label>{t('landing.comparison.chip')}</Chip.Label>
          </Chip>
          <h2 className='text-xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl'>
            {t('landing.comparison.titleStart')}{' '}
            <span className='bg-linear-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent'>
              {t('landing.comparison.titleBrand')}
            </span>
          </h2>
          <p className='text-base text-muted lg:text-md'>{t('landing.comparison.subtitle')}</p>
        </div>
        <LottieIcon
          loop
          src={theme === 'dark' ? privacy_dark : privacy}
          size={160}
          className='shrink-0'
        />
      </div>

      <div className='relative'>
        <div className='absolute -inset-y-4 start-0 w-1/2 rounded-3xl bg-white shadow-surface shadow-lg sm:start-[44%] sm:w-[28%]' />

        <table className='relative w-full table-fixed'>
          <colgroup>
            <col className='hidden w-0 sm:table-column sm:w-[44%]' />
            <col className='w-1/2 sm:w-[28%]' />
            <col className='w-1/2 sm:w-[28%]' />
          </colgroup>
          <thead>
            <tr>
              <th className='hidden px-2 py-5 text-start text-base font-bold text-foreground sm:table-cell'>
                {t('landing.comparison.chip')}
              </th>
              <th className='px-2 py-5 text-center'>
                <div className='flex items-center justify-center gap-1.5'>
                  <div className='flex h-5 w-5 items-center justify-center rounded-full bg-primary'>
                    <IconCheck size={12} className='text-primary-foreground' strokeWidth={3} />
                  </div>
                  <span className='text-base font-bold text-neutral-900'>
                    {t('landing.comparison.header.ours')}
                  </span>
                </div>
              </th>
              <th className='px-2 py-5 text-center text-base font-bold text-muted'>
                {t('landing.comparison.header.theirs')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.feature}>
                <td className='hidden border-t border-default-200 px-2 py-4 text-sm text-foreground sm:table-cell'>
                  {row.feature}
                </td>
                <td className='px-2 py-4 text-center text-sm font-semibold text-neutral-900'>
                  {row.ours}
                </td>
                <td className='border-t border-default-200 px-2 py-4 text-center text-sm text-muted'>
                  {row.theirs}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
