import {
  IconAffiliate,
  IconArrowsExchange,
  IconLock,
  IconShieldCheck,
  IconUsers,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { coreEnv } from '../../env';
import { useTheme } from '../../hooks';

const SERVERS = [
  { flag: '🇦🇹', name: 'Austria', stableId: 'c2895df5f9d24049' },
  { flag: '🇺🇸', name: 'United States', stableId: '0172cd32ccd7cfcd' },
  { flag: '🇩🇪', name: 'Germany', stableId: '42cd27737e86d4af' },
  { flag: '🇳🇱', name: 'Netherlands', stableId: 'bcc819be08a37eb6' },
  { flag: '🇫🇮', name: 'Finland', stableId: '4cd8b86c7c3a66f5' },
  { flag: '🇷🇺', name: 'Russia', stableId: '55d99e8dc5987ec2' },
];

function ProductIllustration() {
  const { theme } = useTheme();
  return (
    <div className='flex h-full flex-col gap-2 '>
      {SERVERS.map(({ flag, name, stableId }) => (
        <div
          key={name}
          className='flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5'
        >
          <div className='flex min-w-0 items-center gap-2'>
            <span className='text-lg'>{flag}</span>
            <span className='truncate text-sm font-medium text-white'>{name}</span>
          </div>
          <iframe
            src={`https://health.thejungle.pro/?stableId=${stableId}&theme=${theme}&transparent=true&rounded=full&showName=false`}
            width={160}
            height={40}
            title={name}
            frameBorder={0}
            className='flex-shrink-0'
          />
        </div>
      ))}
    </div>
  );
}

export function BentoSection() {
  const { t } = useTranslation();

  return (
    <section className='mx-auto w-full px-6 py-48 md:px-12 lg:px-24'>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl'>
          {t('landing.bento.titleStart')}{' '}
          <span className='bg-linear-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent'>
            {t('landing.bento.titleBrand')}
          </span>
        </h2>
        <p className='text-muted text-base lg:text-lg'>{t('landing.bento.subtitle')}</p>
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[repeat(3,220px)]'>
        {/* Affiliate — wide top-left */}
        <div className='relative flex min-h-50 flex-col justify-between overflow-hidden rounded-3xl bg-violet-300 p-7 dark:bg-violet-500 sm:col-span-2 lg:col-[1/3] lg:row-1'>
          <div className='absolute -right-10 -top-10 h-44 w-44 rounded-full bg-violet-200/60 dark:bg-violet-800/30' />
          <IconAffiliate size={40} className='relative text-violet-400 dark:text-violet-100' />
          <div className='relative'>
            <h3 className='text-xl font-bold text-violet-800 dark:text-foreground'>
              {t('landing.bento.affiliate.title')}
            </h3>
            <p className='mt-1.5 text-sm leading-relaxed text-violet-700/80 dark:text-violet-200'>
              {t('landing.bento.affiliate.description')}
            </p>
            <a
              href={coreEnv.affiliatePortalUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-600 underline underline-offset-2 hover:text-violet-700 dark:text-violet-200 dark:hover:text-violet-300'
            >
              {t('landing.bento.learnMore')} →
            </a>
          </div>
        </div>

        {/* Reverse VPN — top-right col 1 */}
        <div className='relative flex min-h-50 flex-col justify-between overflow-hidden rounded-3xl bg-amber-200 p-7 dark:bg-amber-300 lg:col-[3/4] lg:row-1'>
          <IconArrowsExchange size={36} className='text-amber-500' />
          <div>
            <h3 className='text-base font-bold text-amber-900 dark:text-amber-900'>
              {t('landing.bento.reverseVpn.title')}
            </h3>
            <p className='mt-1 text-xs leading-relaxed text-amber-700 dark:text-amber-900'>
              {t('landing.bento.reverseVpn.description')}
            </p>
          </div>
        </div>

        {/* Security — top-right col 2 */}
        <div className='relative flex min-h-50 flex-col justify-between overflow-hidden rounded-3xl bg-sky-200 p-7 dark:bg-sky-950/60 lg:col-[4/5] lg:row-1'>
          <IconShieldCheck size={36} className='text-sky-500' />
          <div>
            <h3 className='text-base font-bold text-sky-900 dark:text-sky-100'>
              {t('landing.bento.security.title')}
            </h3>
            <p className='mt-1 text-xs leading-relaxed text-sky-700/80 dark:text-sky-300/80'>
              {t('landing.bento.security.description')}
            </p>
          </div>
        </div>

        {/* Center product illustration — spans rows 2–3, cols 1–2 */}
        <div className='relative flex min-h-80 flex-col overflow-hidden rounded-3xl bg-gray-950 p-7 sm:col-span-2 lg:min-h-0 lg:col-[1/3] lg:row-[2/4]'>
          <div className='absolute inset-0 bg-linear-to-br from-violet-100/40 via-transparent to-emerald-900/20' />
          <div className='relative z-10 flex-1'>
            <ProductIllustration />
          </div>
        </div>

        {/* Encryption — middle-right */}
        <div className='relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-3xl bg-emerald-100 p-7 dark:bg-emerald-950/60 sm:col-span-2 lg:[grid-column:3/5] lg:[grid-row:2]'>
          <IconLock size={36} className='text-emerald-500' />
          <div>
            <p className='mt-1 text-xs leading-relaxed text-emerald-700/80 dark:text-emerald-300/80'>
              {t('landing.bento.encryption.description')}
            </p>
          </div>
        </div>

        {/* Referral — bottom-right */}
        <div className='relative flex min-h-50 flex-col justify-between overflow-hidden rounded-3xl bg-rose-100 p-7 dark:bg-rose-950/60 sm:col-span-2 lg:[grid-column:3/5] lg:[grid-row:3]'>
          <div className='absolute -bottom-8 -right-8 h-36 w-36 rounded-full bg-rose-100 dark:bg-rose-900/30' />
          <IconUsers size={36} className='relative text-rose-500' />
          <div className='relative'>
            <h3 className='text-base font-bold text-rose-900 dark:text-rose-100'>
              {t('landing.bento.referral.title')}
            </h3>
            <p className='mt-1 text-xs leading-relaxed text-rose-700/80 dark:text-rose-300/80'>
              {t('landing.bento.referral.description')}
            </p>
            <a
              href={coreEnv.tmaAppUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='mt-4 inline-flex items-center gap-1 text-sm font-semibold text-rose-600 underline underline-offset-2 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300'
            >
              {t('landing.bento.learnMore')} →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
