import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '../../hooks';
import { Heading } from '../../ui';
import { Paragraph } from '../../ui/Paragraph';
import { PRICING_PATH } from '../../utils';

export function CTASection({ onCtaClick }: { onCtaClick?: () => void } = {}) {
  const { t } = useTranslation();
  const navigate = useNavigation();

  return (
    <section id='cta'>
      <div className='relative overflow-hidden p-8 rounded-3xl bg-linear-to-r  from-purple-400 to-yellow-400 py-16 text-center shadow-xl'>
        <div className='relative flex flex-col items-center gap-6'>
          <div className='flex flex-col gap-3'>
            <Heading as='h2' className={'text-white'}>
              {t('landing.cta.title')}
            </Heading>
            <Paragraph className={'text-white'}>{t('landing.cta.subtitle')}</Paragraph>
          </div>

          <Button
            size='lg'
            className=' font-semibold shadow-lg bg-white text-black'
            onClick={onCtaClick ?? (() => navigate(PRICING_PATH))}
          >
            {t('common.cta')}
          </Button>
        </div>
      </div>
    </section>
  );
}
