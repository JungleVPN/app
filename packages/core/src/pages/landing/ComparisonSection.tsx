import { Chip } from '@heroui/react';
import { IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

type Row = {
  feature: string;
  ours: string;
  theirs: string;
};

export function ComparisonSection() {
  const { t } = useTranslation();

  const rows: Row[] = [
    {
      feature: t('landing.comparison.rows.speed.feature'),
      ours: t('landing.comparison.rows.speed.ours'),
      theirs: t('landing.comparison.rows.speed.theirs'),
    },
    {
      feature: t('landing.comparison.rows.dataLimit.feature'),
      ours: t('landing.comparison.rows.dataLimit.ours'),
      theirs: t('landing.comparison.rows.dataLimit.theirs'),
    },
    {
      feature: t('landing.comparison.rows.support.feature'),
      ours: t('landing.comparison.rows.support.ours'),
      theirs: t('landing.comparison.rows.support.theirs'),
    },
    {
      feature: t('landing.comparison.rows.devices.feature'),
      ours: t('landing.comparison.rows.devices.ours'),
      theirs: t('landing.comparison.rows.devices.theirs'),
    },
    {
      feature: t('landing.comparison.rows.tracking.feature'),
      ours: t('landing.comparison.rows.tracking.ours'),
      theirs: t('landing.comparison.rows.tracking.theirs'),
    },
  ];

  return (
    <section>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <Chip color='default' variant='secondary' className='w-fit'>
          <Chip.Label>{t('landing.comparison.chip')}</Chip.Label>
        </Chip>
        <h2 className='text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl'>
          {t('landing.comparison.titleStart')}{' '}
          <span className='bg-linear-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent'>
            {t('landing.comparison.titleBrand')}
          </span>
        </h2>
        <p className='max-w-xl text-base text-muted lg:text-lg'>
          {t('landing.comparison.subtitle')}
        </p>
      </div>

      <div className='overflow-hidden rounded-2xl border border-default-200 bg-content1'>
        <table className='w-full table-fixed'>
          <colgroup>
            <col className='w-1/2 md:w-[45%]' />
            <col className='w-1/4 md:w-[27.5%]' />
            <col className='w-1/4 md:w-[27.5%]' />
          </colgroup>
          <thead>
            <tr className='border-b border-default-200'>
              <th className='px-6 py-5 text-left text-sm font-semibold text-foreground'>
                {t('landing.comparison.header.feature')}
              </th>
              <th className='px-4 py-5 text-center'>
                <div className='flex flex-col items-center gap-1.5'>
                  <div className='flex h-6 w-6 items-center justify-center rounded-full bg-success/20'>
                    <IconCheck size={14} className='text-success' strokeWidth={2.5} />
                  </div>
                  <span className='text-sm font-semibold text-foreground'>
                    {t('landing.comparison.header.ours')}
                  </span>
                </div>
              </th>
              <th className='px-4 py-5 text-center'>
                <span className='text-sm font-semibold text-muted'>
                  {t('landing.comparison.header.theirs')}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.feature}
                className={i < rows.length - 1 ? 'border-b border-default-200' : undefined}
              >
                <td className='px-6 py-4 text-sm text-foreground'>{row.feature}</td>
                <td className='px-4 py-4 text-center text-sm font-semibold text-foreground'>
                  {row.ours}
                </td>
                <td className='px-4 py-4 text-center text-sm text-muted'>{row.theirs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
