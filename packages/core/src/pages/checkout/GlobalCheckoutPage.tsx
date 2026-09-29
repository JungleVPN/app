import { GLOBAL_PAYMENT_PROVIDER } from '../../utils';
import PaddleCheckoutPage from '../paddleCheckout/PaddleCheckoutPage';
import WhopCheckoutPage from '../whopCheckout/WhopCheckoutPage';

interface GlobalCheckoutPageProps {
  fallbackPath?: string;
}

/**
 * The dedicated checkout route, resolved to whichever global provider mounts
 * its checkout on our own page. Stripe redirects to a hosted session instead,
 * so it never lands here.
 */
export default function GlobalCheckoutPage({ fallbackPath }: GlobalCheckoutPageProps) {
  return GLOBAL_PAYMENT_PROVIDER === 'whop' ? (
    <WhopCheckoutPage fallbackPath={fallbackPath} />
  ) : (
    <PaddleCheckoutPage fallbackPath={fallbackPath} />
  );
}
