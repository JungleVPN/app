import { useTranslation } from 'react-i18next';
import { FooterSection, StickyFooterReveal } from '../../components';
import { Container } from '../../ui';

export default function ReferralsPage() {
  const { t } = useTranslation();

  return (
    <div className='relative bg-[#1a1a1a]'>
      <div className='relative lg:sticky top-0 z-10 bg-gray-100 overflow-hidden pt-30 pb-32 md:py-56 lg:py-40'>
        <Container>
          <h1 className='font-primary font-extrabold text-4xl md:text-6xl text-center text-[#1a1a1a]'>
            {t('referrals.pageTitle')}
          </h1>
        </Container>
      </div>

      <div className='relative z-10'>
        <StickyFooterReveal>
          <Container className={'-mt-20 pt-20'}>
            <FooterSection />
          </Container>
        </StickyFooterReveal>
      </div>
    </div>
  );
}
