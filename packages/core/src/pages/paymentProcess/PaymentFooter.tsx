import { LanguageSwitcher, Link, SupportButton } from '../../components';
import { Container } from '../../ui';

/**
 * Checkout-only footer: a slim legal/support bar, deliberately lighter than the
 * landing page's `FooterSection` so it doesn't compete with the payment steps.
 */
export function PaymentFooter() {
  return (
    <footer className='mt-12 w-full border-t border-foreground/10 fixed bottom-0 bg-white'>
      <Container maxWidth='lg'>
        <div className='flex flex-col items-center justify-between gap-4 py-5 sm:flex-row'>
          <div className='flex flex-wrap items-center justify-center gap-x-6 gap-y-2'>
            <p className='text-sm text-muted'>
              © {new Date().getFullYear()} JungleVPN. All rights reserved.
            </p>
            <Link
              className='text-sm text-muted underline underline-offset-2 transition-colors hover:text-foreground'
              href='/terms'
            >
              Terms of Service
            </Link>
          </div>

          <div className='flex items-center gap-4'>
            <SupportButton variant='inline' label='Contact us' />
            <span aria-hidden className='h-4 w-px bg-foreground/15' />
            <LanguageSwitcher />
          </div>
        </div>
      </Container>
    </footer>
  );
}
