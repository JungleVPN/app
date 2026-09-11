import { useTranslation } from 'react-i18next';
import { LanguageSwitcher, Link, SupportButton } from '../../components';
import { Container } from '../../ui';

/**
 * Checkout-only footer: a slim legal/support bar, deliberately lighter than the
 * landing page's `FooterSection` so it doesn't compete with the payment steps.
 */
export function PaymentFooter() {
  const { t } = useTranslation();

  return (
    <footer className='w-full border-t border-foreground/10 bg-white'>
      <Container maxWidth='lg'>
        <div className='flex flex-col items-center justify-between gap-4 py-5 sm:flex-row'>
          <div className='flex flex-wrap items-center justify-center gap-x-6 gap-y-2'>
            <p className='text-sm text-muted'>
              {t('paymentFooter.copyright', { year: new Date().getFullYear() })}
            </p>
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
