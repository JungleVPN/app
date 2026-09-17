import { GLOBAL_PAYMENT_PROVIDER } from '../../utils';
import PaddleCheckoutPage from '../paddleGetSubscription/PaddleCheckoutPage';
import StripeCheckoutPage from './StripeCheckoutPage';

/**
 * The one global checkout route (`/payment/:planSlug`), resolved to whichever
 * provider is currently enabled. Both pages share `useCheckout` and
 * `CheckoutForm`, so switching providers changes who takes the payment and
 * nothing else about the page.
 */
export default GLOBAL_PAYMENT_PROVIDER === 'paddle' ? PaddleCheckoutPage : StripeCheckoutPage;
