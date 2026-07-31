import { Surface } from '@heroui/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBackButton, useNavigation } from '../../hooks';
import { useNavbarStore } from '../../stores';

const olClass =
  'list-decimal list-outside space-y-2 pl-5 text-sm leading-relaxed text-muted marker:text-muted';
const ulClass =
  'list-disc list-outside space-y-2 pl-5 text-sm leading-relaxed text-muted marker:text-muted';

export default function TermsPage() {
  const { t } = useTranslation();
  const { setNavbarVisible } = useNavbarStore();
  const navigate = useNavigation();

  useBackButton(() => navigate(-1));

  useEffect(() => {
    setNavbarVisible(false);
    return () => {
      setNavbarVisible(true);
    };
  }, [setNavbarVisible]);

  return (
    <Surface className='flex min-w-[320px] flex-col gap-3 rounded-3xl p-6' variant='secondary'>
      <h1 className='mb-5 text-lg font-semibold tracking-tight'>{t('terms.pageTitle')}</h1>

      <section aria-labelledby='terms-s1' className='flex flex-col gap-2'>
        <h2 className='text-sm font-medium text-foreground' id='terms-s1'>
          {t('terms.s1.h')}
        </h2>
        <ol className={olClass}>
          <li>{t('terms.s1.i1')}</li>
          <li>{t('terms.s1.i2')}</li>
          <li>{t('terms.s1.i3')}</li>
          <li>{t('terms.s1.i4')}</li>
        </ol>
      </section>

      <section aria-labelledby='terms-s2' className='flex flex-col gap-2'>
        <h2 className='text-sm font-medium text-foreground' id='terms-s2'>
          {t('terms.s2.h')}
        </h2>
        <ol className={olClass}>
          <li>{t('terms.s2.i1')}</li>
          <li>
            {t('terms.s2.i2_lead')}
            <ul className={`${ulClass} mt-2`}>
              <li>{t('terms.s2.i2_u1')}</li>
              <li>{t('terms.s2.i2_u2')}</li>
              <li>{t('terms.s2.i2_u3')}</li>
            </ul>
          </li>
          <li>{t('terms.s2.i3')}</li>
          <li>{t('terms.s2.i4')}</li>
        </ol>
      </section>

      <section aria-labelledby='terms-s3' className='flex flex-col gap-2'>
        <h2 className='text-sm font-medium text-foreground' id='terms-s3'>
          {t('terms.s3.h')}
        </h2>
        <ol className={olClass}>
          <li>{t('terms.s3.i1')}</li>
          <li>
            {t('terms.s3.i2_lead')}
            <ul className={`${ulClass} mt-2`}>
              <li>{t('terms.s3.i2_u1')}</li>
              <li>{t('terms.s3.i2_u2')}</li>
              <li>{t('terms.s3.i2_u3')}</li>
            </ul>
          </li>
          <li>
            {t('terms.s3.i3_lead')}
            <ul className={`${ulClass} mt-2`}>
              <li>{t('terms.s3.i3_u1')}</li>
              <li>{t('terms.s3.i3_u2')}</li>
              <li>{t('terms.s3.i3_u3')}</li>
              <li>{t('terms.s3.i3_u4')}</li>
            </ul>
          </li>
          <li>{t('terms.s3.i4')}</li>
        </ol>
      </section>

      <section aria-labelledby='terms-s4' className='flex flex-col gap-2'>
        <h2 className='text-sm font-medium text-foreground' id='terms-s4'>
          {t('terms.s4.h')}
        </h2>
        <ol className={olClass}>
          <li>{t('terms.s4.i1')}</li>
          <li>{t('terms.s4.i2')}</li>
          <li>{t('terms.s4.i3')}</li>
          <li>
            {t('terms.s4.i4_lead')}
            <ul className={`${ulClass} mt-2`}>
              <li>{t('terms.s4.i4_u1')}</li>
              <li>{t('terms.s4.i4_u2')}</li>
              <li>{t('terms.s4.i4_u3')}</li>
              <li>{t('terms.s4.i4_u4')}</li>
              <li>{t('terms.s4.i4_u5')}</li>
              <li>{t('terms.s4.i4_u6')}</li>
              <li>{t('terms.s4.i4_u7')}</li>
            </ul>
          </li>
          <li>{t('terms.s4.i5')}</li>
        </ol>
      </section>

      <section aria-labelledby='terms-s5' className='flex flex-col gap-2'>
        <h2 className='text-sm font-medium text-foreground' id='terms-s5'>
          {t('terms.s5.h')}
        </h2>
        <ol className={olClass}>
          <li>{t('terms.s5.i1')}</li>
          <li>{t('terms.s5.i2')}</li>
          <li>{t('terms.s5.i3')}</li>
        </ol>
      </section>

      <section aria-labelledby='terms-s6' className='flex flex-col gap-2'>
        <h2 className='text-sm font-medium text-foreground' id='terms-s6'>
          {t('terms.s6.h')}
        </h2>
        <ol className={olClass}>
          <li>
            {t('terms.s6.i1_lead')}
            <ul className={`${ulClass} mt-2`}>
              <li>{t('terms.s6.i1_u1')}</li>
              <li>{t('terms.s6.i1_u2')}</li>
              <li>{t('terms.s6.i1_u3')}</li>
            </ul>
          </li>
          <li>{t('terms.s6.i2')}</li>
          <li>{t('terms.s6.i3')}</li>
        </ol>
      </section>

      <section aria-labelledby='terms-s7' className='flex flex-col gap-2'>
        <h2 className='text-sm font-medium text-foreground' id='terms-s7'>
          {t('terms.s7.h')}
        </h2>
        <ol className={olClass}>
          <li>{t('terms.s7.i1')}</li>
          <li>{t('terms.s7.i6')}</li>
        </ol>
      </section>

      <section aria-labelledby='terms-s8' className='flex flex-col gap-2'>
        <h2 className='text-sm font-medium text-foreground' id='terms-s8'>
          {t('terms.s8.h')}
        </h2>
        <ul className={ulClass}>
          <li>{t('terms.s8.u1')}</li>
          <li>{t('terms.s8.u2')}</li>
          <li>{t('terms.s8.u3')}</li>
          <li>{t('terms.s8.u4')}</li>
          <li>{t('terms.s8.u5')}</li>
          <li>{t('terms.s8.u6')}</li>
        </ul>
      </section>

      <section aria-labelledby='terms-s9' className='flex flex-col gap-2'>
        <h2 className='text-sm font-medium text-foreground' id='terms-s9'>
          {t('terms.s9.h')}
        </h2>
        <ol className={olClass}>
          <li>{t('terms.s9.i1')}</li>
          <li>{t('terms.s9.i2')}</li>
          <li>{t('terms.s9.i3')}</li>
          <li>{t('terms.s9.i4')}</li>
          <li>
            {t('terms.s9.i5_lead')}
            <ul className={`${ulClass} mt-2`}>
              <li>{t('terms.s9.i5_u1')}</li>
              <li>{t('terms.s9.i5_u2')}</li>
              <li>{t('terms.s9.i5_u3')}</li>
              <li>{t('terms.s9.i5_u4')}</li>
              <li>{t('terms.s9.i5_u5')}</li>
              <li>{t('terms.s9.i5_u6')}</li>
            </ul>
          </li>
          <li>{t('terms.s9.i6')}</li>
          <li>{t('terms.s9.i7')}</li>
        </ol>
      </section>

      <section aria-labelledby='terms-s10' className='flex flex-col gap-2'>
        <h2 className='text-sm font-medium text-foreground' id='terms-s10'>
          {t('terms.s10.h')}
        </h2>
        <ol className={olClass}>
          <li>{t('terms.s10.i1')}</li>
          <li>{t('terms.s10.i2')}</li>
          <li>{t('terms.s10.i3')}</li>
        </ol>
      </section>

      <section aria-labelledby='terms-s11' className='flex flex-col gap-2'>
        <h2 className='text-sm font-medium text-foreground' id='terms-s11'>
          {t('terms.s11.h')}
        </h2>
        <ol className={olClass}>
          <li>{t('terms.s11.i1')}</li>
        </ol>
      </section>

      <section aria-labelledby='terms-s12' className='flex flex-col gap-2'>
        <h2 className='text-sm font-medium text-foreground' id='terms-s12'>
          {t('terms.s12.h')}
        </h2>
        <ol className={olClass}>
          <li>{t('terms.s12.i1')}</li>
          <li>{t('terms.s12.i2')}</li>
          <li>{t('terms.s12.i3')}</li>
          <li>{t('terms.s12.i4')}</li>
          <li>{t('terms.s12.i5')}</li>
          <li>{t('terms.s12.i6')}</li>
          <li>{t('terms.s12.i7')}</li>
          <li>{t('terms.s12.i8')}</li>
        </ol>
      </section>

      <section aria-labelledby='terms-s13' className='flex flex-col gap-2'>
        <h2 className='text-sm font-medium text-foreground' id='terms-s13'>
          {t('terms.s13.h')}
        </h2>
        <ol className={olClass}>
          <li>{t('terms.s13.i1')}</li>
          <li>{t('terms.s13.i2')}</li>
          <li>{t('terms.s13.i3')}</li>
          <li>{t('terms.s13.i4')}</li>
        </ol>
      </section>

      <section aria-labelledby='terms-s14' className='flex flex-col gap-2'>
        <h2 className='text-sm font-medium text-foreground' id='terms-s14'>
          {t('terms.s14.h')}
        </h2>
        <ol className={olClass}>
          <li>{t('terms.s14.i1')}</li>
          <li>{t('terms.s14.i2')}</li>
          <li>
            {t('terms.s14.i3_lead')}
            <ul className={`${ulClass} mt-2`}>
              <li>{t('terms.s14.i3_u1')}</li>
              <li>{t('terms.s14.i3_u2')}</li>
              <li>{t('terms.s14.i3_u3')}</li>
            </ul>
          </li>
          <li>{t('terms.s14.i4')}</li>
        </ol>
      </section>

      <section aria-labelledby='terms-s15' className='flex flex-col gap-2'>
        <h2 className='text-sm font-medium text-foreground' id='terms-s15'>
          {t('terms.s15.h')}
        </h2>
        <ol className={olClass}>
          <li>{t('terms.s15.i1')}</li>
          <li>{t('terms.s15.i2')}</li>
          <li>{t('terms.s15.i3')}</li>
        </ol>
      </section>

      <p className='text-sm leading-relaxed text-muted'>{t('terms.footer')}</p>
    </Surface>
  );
}
