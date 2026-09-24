import { useTranslation } from 'react-i18next';
import { LanguageSwitcher, Link, SupportButton } from '../../components';
import { Container } from '../../ui';
import { Paragraph } from '../../ui/Paragraph';

export function SecondaryFooter() {
  const { t } = useTranslation();

  return (
    <footer className='w-full border-t border-foreground/10 bg-white'>
      <Container maxWidth='lg'>
        <div className='flex flex-col items-center justify-between gap-4 py-5 sm:flex-row'>
          <div className='flex flex-wrap items-center justify-center gap-x-6 gap-y-2'>
            <Paragraph>
              {t('paymentFooter.copyright', { year: new Date().getFullYear() })}
            </Paragraph>
            <Link
              className='text-sm text-muted underline underline-offset-2 transition-colors hover:text-foreground'
              href='/terms'
            >
              {t('paymentFooter.terms')}
            </Link>
          </div>

          <div className='flex items-center gap-4'>
            <SupportButton variant='inline' label={t('paymentFooter.support')} />
            <span aria-hidden className='h-4 w-px bg-foreground/15' />
            <LanguageSwitcher />
          </div>
        </div>
      </Container>
    </footer>
  );
}
