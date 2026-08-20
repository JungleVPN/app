import { Surface } from '@heroui/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigationType } from 'react-router';
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

export default function PrivacyPolicyPage() {
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
    <Page title={t('privacy.pageTitle')}>
      <Surface className='flex min-w-[320px] flex-col gap-3 rounded-3xl p-6' variant='secondary'>
        <section aria-labelledby='privacy-s1' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='privacy-s1'>
            {t('privacy.s1.h')}
          </h2>
          <ol className={olClass}>
            <li>{t('privacy.s1.i1')}</li>
            <li>{t('privacy.s1.i2')}</li>
            <li>{t('privacy.s1.i3')}</li>
          </ol>
        </section>

        <section aria-labelledby='privacy-s2' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='privacy-s2'>
            {t('privacy.s2.h')}
          </h2>
          <ol className={olClass}>
            <li>{t('privacy.s2.i1')}</li>
            <li>{t('privacy.s2.i2')}</li>
            <li>{t('privacy.s2.i3')}</li>
          </ol>
        </section>

        <section aria-labelledby='privacy-s3' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='privacy-s3'>
            {t('privacy.s3.h')}
          </h2>
          <ol className={olClass}>
            <li>
              {t('privacy.s3.i1_lead')}
              <ul className={`${ulClass} mt-2`}>
                <li>{t('privacy.s3.i1_u1')}</li>
                <li>{t('privacy.s3.i1_u2')}</li>
                <li>{t('privacy.s3.i1_u3')}</li>
              </ul>
            </li>
            <li>
              {t('privacy.s3.i2_lead')}
              <ul className={`${ulClass} mt-2`}>
                <li>{t('privacy.s3.i2_u1')}</li>
                <li>{t('privacy.s3.i2_u2')}</li>
                <li>{t('privacy.s3.i2_u3')}</li>
                <li>{t('privacy.s3.i2_u4')}</li>
              </ul>
            </li>
            <li>
              {t('privacy.s3.i3_lead')}
              <ul className={`${ulClass} mt-2`}>
                <li>{t('privacy.s3.i3_u1')}</li>
                <li>{t('privacy.s3.i3_u2')}</li>
              </ul>
            </li>
            <li>
              {t('privacy.s3.i4_lead')}
              <ul className={`${ulClass} mt-2`}>
                <li>{t('privacy.s3.i4_u1')}</li>
                <li>{t('privacy.s3.i4_u2')}</li>
                <li>{t('privacy.s3.i4_u3')}</li>
                <li>{t('privacy.s3.i4_u4')}</li>
              </ul>
            </li>
          </ol>
        </section>

        <section aria-labelledby='privacy-s4' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='privacy-s4'>
            {t('privacy.s4.h')}
          </h2>
          <ol className={olClass}>
            <li>{t('privacy.s4.i1')}</li>
            <li>{t('privacy.s4.i2')}</li>
            <li>{t('privacy.s4.i3')}</li>
            <li>{t('privacy.s4.i4')}</li>
            <li>{t('privacy.s4.i5')}</li>
          </ol>
        </section>

        <section aria-labelledby='privacy-s5' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='privacy-s5'>
            {t('privacy.s5.h')}
          </h2>
          <ol className={olClass}>
            <li>{t('privacy.s5.i1')}</li>
            <li>
              {t('privacy.s5.i2_lead')}
              <ul className={`${ulClass} mt-2`}>
                <li>{t('privacy.s5.i2_u1')}</li>
                <li>{t('privacy.s5.i2_u3')}</li>
                <li>{t('privacy.s5.i2_u4')}</li>
              </ul>
            </li>
          </ol>
        </section>

        <section aria-labelledby='privacy-s6' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='privacy-s6'>
            {t('privacy.s6.h')}
          </h2>
          <ol className={olClass}>
            <li>{t('privacy.s6.i1')}</li>
            <li>{t('privacy.s6.i2')}</li>
            <li>{t('privacy.s6.i3')}</li>
            <li>{t('privacy.s6.i4')}</li>
          </ol>
        </section>

        <section aria-labelledby='privacy-s7' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='privacy-s7'>
            {t('privacy.s7.h')}
          </h2>
          <ul className={ulClass}>
            <li>{t('privacy.s7.u1')}</li>
            <li>{t('privacy.s7.u2')}</li>
            <li>{t('privacy.s7.u3')}</li>
          </ul>
        </section>

        <section aria-labelledby='privacy-s8' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='privacy-s8'>
            {t('privacy.s8.h')}
          </h2>
          <ol className={olClass}>
            <li>{t('privacy.s8.i1')}</li>
            <li>
              {t('privacy.s8.i2_lead')}
              <ul className={`${ulClass} mt-2`}>
                <li>{t('privacy.s8.i2_u1')}</li>
                <li>{t('privacy.s8.i2_u2')}</li>
                <li>{t('privacy.s8.i2_u3')}</li>
                <li>{t('privacy.s8.i2_u4')}</li>
                <li>{t('privacy.s8.i2_u5')}</li>
                <li>{t('privacy.s8.i2_u6')}</li>
              </ul>
            </li>
            <li>{t('privacy.s8.i3')}</li>
            <li>{t('privacy.s8.i4')}</li>
          </ol>
        </section>

        <section aria-labelledby='privacy-s9' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='privacy-s9'>
            {t('privacy.s9.h')}
          </h2>
          <ol className={olClass}>
            <li>{t('privacy.s9.i1')}</li>
            <li>{t('privacy.s9.i2')}</li>
          </ol>
        </section>

        <section aria-labelledby='privacy-s10' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='privacy-s10'>
            {t('privacy.s10.h')}
          </h2>
          <ol className={olClass}>
            <li>{t('privacy.s10.i1')}</li>
            <li>{t('privacy.s10.i2')}</li>
          </ol>
        </section>

        <section aria-labelledby='privacy-s11' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='privacy-s11'>
            {t('privacy.s11.h')}
          </h2>
          <ol className={olClass}>
            <li>{t('privacy.s11.i1')}</li>
            <li>{t('privacy.s11.i2')}</li>
          </ol>
        </section>

        <section aria-labelledby='privacy-s12' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='privacy-s12'>
            {t('privacy.s12.h')}
          </h2>
          <ol className={olClass}>
            <li>{t('privacy.s12.i1')}</li>
            <li>{t('privacy.s12.i2')}</li>
            <li>{t('privacy.s12.i3')}</li>
          </ol>
        </section>

        <section aria-labelledby='privacy-s13' className='flex flex-col gap-2'>
          <h2 className='text-sm font-medium text-foreground' id='privacy-s13'>
            {t('privacy.s13.h')}
          </h2>
          <ol className={olClass}>
            <li>
              {t('privacy.s13.i1_lead')}
              <a
                className={linkClass}
                href={coreEnv.supportUrl}
                target='_blank'
                rel='noopener noreferrer'
              >
                {t('privacy.s13.i1_botLink')}
              </a>
              {t('privacy.s13.i1_mid')}
              <a className={linkClass} href={`mailto:${SUPPORT_EMAIL}`}>
                {t('privacy.s13.i1_emailLink')}
              </a>
              {t('privacy.s13.i1_tail')}
            </li>
          </ol>
        </section>

        <p className='text-sm leading-relaxed text-muted'>{t('privacy.footer')}</p>
      </Surface>
    </Page>
  );
}
