/**
 * What the dedicated Whop checkout route needs to mount a checkout, handed to
 * it as router state by whichever entry point started the payment.
 *
 * Like Paddle's, it is the *result* of the checkout-init call: the entry point
 * owns validation (email, plan, duplicate subscription, throttling) and the
 * route owns only rendering. Router state does not survive a reload or a
 * shared link, so a route that finds none sends the visitor back to pick a plan.
 */
export interface WhopCheckoutState {
  /** The checkout configuration (`ch_...`) the backend created for this payer and plan. */
  checkoutConfigurationId: string;
  /** Payer's email, already validated and stamped on the checkout server-side. */
  email: string;
  /** Plan length in days — carried for analytics, not billing (the configuration decides that). */
  selectedPeriod: number;
}

export function isWhopCheckoutState(value: unknown): value is WhopCheckoutState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as Partial<WhopCheckoutState>;
  return (
    typeof state.checkoutConfigurationId === 'string' &&
    state.checkoutConfigurationId.length > 0 &&
    typeof state.email === 'string' &&
    state.email.length > 0 &&
    typeof state.selectedPeriod === 'number'
  );
}
