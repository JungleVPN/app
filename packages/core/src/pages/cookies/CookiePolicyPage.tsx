import { Surface } from '@heroui/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigationType } from 'react-router';
import { Link } from '../../components';
import { coreEnv } from '../../env';
import { useBackButton, useNavigation } from '../../hooks';
import { useNavbarStore } from '../../stores';
import { Page } from '../../ui';
import { scrollToTop } from '../../utils';

const olClass =
  'list-decimal list-outside space-y-2 ps-5 text-sm leading-relaxed text-muted marker:text-muted';
const ulClass =
  'list-disc list-outside space-y-2 ps-5 text-sm leading-relaxed text-muted marker:text-muted';
const linkClass = 'underline underline-offset-2';
const SUPPORT_EMAIL = 'support@jungle-vpn.com';

const COOKIE_TABLE_ROWS = ['jvReferral', 'jvAttr', 'postHog'] as const;

export default function CookiePolicyPage() {
  const { t } = useTranslation();
  const { setNavbarVisible } = useNavbarStore();
  const navigate = useNavigation();
  const navigationType = useNavigationType();

  useBackButton(() => navigate(-1));

  useEffect(() => {
    setNavbarVisible(false);
    if (navigationType !== 'POP') {
      scrollToTop();
    }
    return () => {
      setNavbarVisible(true);
    };
  }, [setNavbarVisible, navigationType]);

  return (
    <Page title={t('cookies.pageTitle')}>
      <Surface className='flex min-w-[320px] flex-col gap-3 rounded-3xl p-6' variant='secondary'>
        <section aria-labelledby='cookies-s1' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='cookies-s1'>
            {t('cookies.s1.h')}
          </h2>
          <ol className={olClass}>
            <li>{t('cookies.s1.i1')}</li>
            <li>{t('cookies.s1.i2')}</li>
            <li>{t('cookies.s1.i3')}</li>
          </ol>
        </section>

        <section aria-labelledby='cookies-s2' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='cookies-s2'>
            {t('cookies.s2.h')}
          </h2>
          <ol className={olClass}>
            <li>
              {t('cookies.s2.i1_lead')}
              <ul className={`${ulClass} mt-2`}>
                <li>{t('cookies.s2.i1_u1')}</li>
                <li>{t('cookies.s2.i1_u2')}</li>
              </ul>
            </li>
            <li>
              {t('cookies.s2.i2_lead')}
              <ul className={`${ulClass} mt-2`}>
                <li>{t('cookies.s2.i2_u1')}</li>
              </ul>
            </li>
          </ol>
        </section>

        <section aria-labelledby='cookies-s3' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='cookies-s3'>
            {t('cookies.s3.h')}
          </h2>
          <ol className={olClass}>
            <li>{t('cookies.s3.i1')}</li>
            <li>
              {t('cookies.s3.i2_lead')}
              <ul className={`${ulClass} mt-2`}>
                <li>{t('cookies.s3.i2_u1')}</li>
                <li>{t('cookies.s3.i2_u2')}</li>
                <li>{t('cookies.s3.i2_u3')}</li>
              </ul>
            </li>
            <li>{t('cookies.s3.i3')}</li>
          </ol>
        </section>

        <section aria-labelledby='cookies-s4' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='cookies-s4'>
            {t('cookies.s4.h')}
          </h2>
          <p className='text-sm leading-relaxed text-muted'>{t('cookies.s4.lead')}</p>
          <div className='overflow-x-auto rounded-2xl border border-border'>
            <table className='w-full text-start text-sm'>
              <thead>
                <tr className='border-b border-default-200 text-xs text-muted'>
                  <th scope='col' className='px-3 py-2 font-medium'>
                    {t('cookies.s4.table.name')}
                  </th>
                  <th scope='col' className='px-3 py-2 font-medium'>
                    {t('cookies.s4.table.purpose')}
                  </th>
                  <th scope='col' className='px-3 py-2 font-medium'>
                    {t('cookies.s4.table.duration')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {COOKIE_TABLE_ROWS.map((row, index) => (
                  <tr key={row} className={index > 0 ? 'border-t border-default-200' : undefined}>
                    <td className='px-3 py-2 align-top font-mono text-xs text-foreground'>
                      {t(`cookies.s4.rows.${row}.name`)}
                    </td>
                    <td className='px-3 py-2 align-top text-muted'>
                      {t(`cookies.s4.rows.${row}.purpose`)}
                    </td>
                    <td className='px-3 py-2 align-top whitespace-nowrap text-muted'>
                      {t(`cookies.s4.rows.${row}.duration`)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby='cookies-s5' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='cookies-s5'>
            {t('cookies.s5.h')}
          </h2>
          <ol className={olClass}>
            <li>{t('cookies.s5.i1')}</li>
            <li>{t('cookies.s5.i2')}</li>
            <li>{t('cookies.s5.i3')}</li>
          </ol>
        </section>

        <section aria-labelledby='cookies-s6' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='cookies-s6'>
            {t('cookies.s6.h')}
          </h2>
          <ol className={olClass}>
            <li>
              {t('cookies.s6.i1_lead')}
              <Link className={linkClass} href='/privacy'>
                {t('cookies.s6.i1_link')}
              </Link>
              {t('cookies.s6.i1_tail')}
            </li>
          </ol>
        </section>

        <section aria-labelledby='cookies-s7' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='cookies-s7'>
            {t('cookies.s7.h')}
          </h2>
          <ol className={olClass}>
            <li>{t('cookies.s7.i1')}</li>
            <li>{t('cookies.s7.i2')}</li>
          </ol>
        </section>

        <section aria-labelledby='cookies-s8' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='cookies-s8'>
            {t('cookies.s8.h')}
          </h2>
          <ol className={olClass}>
            <li>
              {t('cookies.s8.i1_lead')}
              <a
                className={linkClass}
                href={coreEnv.supportUrl}
                target='_blank'
                rel='noopener noreferrer'
              >
                {t('cookies.s8.i1_botLink')}
              </a>
              {t('cookies.s8.i1_mid')}
              <a className={linkClass} href={`mailto:${SUPPORT_EMAIL}`}>
                {t('cookies.s8.i1_emailLink')}
              </a>
              {t('cookies.s8.i1_tail')}
            </li>
          </ol>
        </section>

        <p className='text-sm leading-relaxed text-muted'>{t('cookies.footer')}</p>
      </Surface>
    </Page>
  );
}
