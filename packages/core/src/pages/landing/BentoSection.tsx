import {
  IconAffiliate,
  IconArrowsExchange,
  IconBolt,
  IconFingerprint,
  IconShieldCheck,
  IconUsers,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export function BentoSection() {
  const { t } = useTranslation();

  return (
    <section>
      <div className='mb-12 flex flex-col items-center gap-3 text-center'>
        <h2 className='text-xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl'>
          {t('landing.bento.titleStart')}{' '}
          <span className='bg-linear-to-r from-purple-400 to-yellow-400 bg-clip-text text-transparent'>
            {t('landing.bento.titleBrand')}
          </span>
        </h2>
        <p className='text-muted text-base lg:text-md'>{t('landing.bento.subtitle')}</p>
      </div>

      <div className='grid grid-cols-2 gap-4 lg:grid-cols-3 lg:grid-rows-[repeat(3,220px)]'>
        {/* Affiliate — wide top-left */}
        <div className='relative flex min-h-50 flex-col justify-between overflow-hidden rounded-3xl bg-violet-300 p-7 col-span-2 lg:col-span-3 lg:row-1 transition-transform duration-300 hover:-translate-y-1.5'>
          <div className='absolute -right-10 -top-10 h-44 w-44 rounded-full bg-violet-200/60' />
          <IconAffiliate size={40} className='relative text-violet-400' />
          <div className='relative'>
            <h3 className='text-xl font-bold text-violet-800'>
              {t('landing.bento.affiliate.title')}
            </h3>
            <p className='mt-1.5 text-sm leading-relaxed text-violet-700/80'>
              {t('landing.bento.affiliate.description')}
            </p>
            <a
              href={'/affiliates'}
              rel='noopener noreferrer'
              className='mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-600 underline underline-offset-2 hover:text-violet-700'
            >
              {t('landing.bento.learnMore')} →
            </a>
          </div>
        </div>

        {/* Reverse VPN — top-right col 1 */}
        <div className='relative flex min-h-50 flex-col justify-between overflow-hidden rounded-3xl bg-amber-200 p-7 transition-transform duration-300 hover:-translate-y-1.5'>
          <IconArrowsExchange size={36} className='text-amber-500' />
          <div>
            <h3 className='text-base font-bold text-amber-900'>
              {t('landing.bento.smartRouting.title')}
            </h3>
            <p className='mt-1 text-xs leading-relaxed text-amber-700'>
              {t('landing.bento.smartRouting.description')}
            </p>
          </div>
        </div>

        {/* Security — top-right col 2 */}
        <div className='relative flex min-h-50 flex-col justify-between overflow-hidden rounded-3xl bg-sky-200 p-7 transition-transform duration-300 hover:-translate-y-1.5'>
          <IconShieldCheck size={36} className='text-sky-500' />
          <div>
            <h3 className='text-base font-bold text-sky-900'>
              {t('landing.bento.security.title')}
            </h3>
            <p className='mt-1 text-xs leading-relaxed text-sky-700/80'>
              {t('landing.bento.security.description')}
            </p>
          </div>
        </div>

        {/* Privacy — row 2, cols 1–2 */}
        <div className='relative flex min-h-50 flex-col justify-between overflow-hidden rounded-3xl bg-indigo-100 p-7 transition-transform duration-300 hover:-translate-y-1.5'>
          <div className='absolute -right-8 -top-8 h-36 w-36 rounded-full bg-indigo-200/60' />
          <IconFingerprint size={36} className='relative text-indigo-500' />
          <div className='relative'>
            <h3 className='text-base font-bold text-indigo-900'>
              {t('landing.bento.privacy.title')}
            </h3>
            <p className='mt-1 text-xs leading-relaxed text-indigo-700/80'>
              {t('landing.bento.privacy.description')}
            </p>
          </div>
        </div>

        {/* Speed — row 3, cols 1–2 */}
        <div className='relative flex min-h-50 flex-col justify-between overflow-hidden rounded-3xl bg-cyan-100 p-7 transition-transform duration-300 hover:-translate-y-1.5'>
          <div className='absolute -right-8 -top-8 h-36 w-36 rounded-full bg-cyan-200/60' />
          <IconBolt size={36} className='relative text-cyan-500' />
          <div className='relative'>
            <h3 className='text-base font-bold text-cyan-900'>{t('landing.bento.speed.title')}</h3>
            <p className='mt-1 text-xs leading-relaxed text-cyan-700/80'>
              {t('landing.bento.speed.description')}
            </p>
          </div>
        </div>

        {/* ProductIllustration (server latency list) — commented out for now */}
        {/* <div className='relative flex min-h-80 flex-col overflow-hidden rounded-3xl bg-gray-950 p-7 sm:col-span-2 lg:min-h-0 lg:col-[1/3] lg:row-[2/4]'>
          <div className='absolute inset-0 bg-linear-to-br from-violet-100/40 via-transparent to-emerald-900/20' />
          <div className='relative z-10 flex-1'>
            <ProductIllustration />
          </div>
        </div> */}

        {/* Referral — bottom-right */}
        <div className='relative flex min-h-50 flex-col justify-between overflow-hidden rounded-3xl bg-rose-100 p-7 col-span-2 transition-transform duration-300 hover:-translate-y-1.5'>
          <div className='absolute -bottom-8 -right-8 h-36 w-36 rounded-full bg-rose-100' />
          <IconUsers size={36} className='relative text-rose-500' />
          <div className='relative'>
            <h3 className='text-base font-bold text-rose-900'>
              {t('landing.bento.referral.title')}
            </h3>
            <p className='mt-1 text-xs leading-relaxed text-rose-700/80'>
              {t('landing.bento.referral.description')}
            </p>
            <a
              href={'/profile/referrals'}
              target='_blank'
              rel='noopener noreferrer'
              className='mt-4 inline-flex items-center gap-1 text-sm font-semibold text-rose-600 underline underline-offset-2 hover:text-rose-700'
            >
              {t('landing.bento.learnMore')} →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
