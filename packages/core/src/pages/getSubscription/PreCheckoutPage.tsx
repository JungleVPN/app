import { currentScope } from '../../utils';
import RuStartCheckoutPage from '../ruGetSubscription/RuStartCheckoutPage';
import WhopStartCheckoutPage from '../whopGetSubscription/WhopStartCheckoutPage';

/**
 * The one checkout route (`/payment/:planId`), resolved to whoever takes the
 * payment on this domain: YooKassa on the RU domains, and whichever global
 * provider is currently enabled everywhere else.
 *
 * Every page shares `useCheckout` and `CheckoutForm`, so the provider changes
 * who takes the money and nothing else about the page.
 *
 * Resolved per render rather than at module scope: `currentScope` reads the
 * request hostname, which SSR only knows once a request is in flight.
 */
export default function PreCheckoutPage() {
  if (currentScope() === 'ru') return <RuStartCheckoutPage />;

  return <WhopStartCheckoutPage />;
}
