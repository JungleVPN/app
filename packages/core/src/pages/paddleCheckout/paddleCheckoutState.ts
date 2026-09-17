/**
 * What the dedicated Paddle checkout route needs to mount a checkout, handed
 * to it as router state by whichever entry point started the payment.
 *
 * It is deliberately the *result* of the checkout-init call, not the request:
 * the entry point owns validation (email, period, duplicate subscription,
 * throttling) and the route owns only rendering the payment form. Router state
 * does not survive a reload or a shared link, so a route that finds none sends
 * the visitor back to pick a plan rather than guessing.
 */
export interface PaddleCheckoutState {
  priceId: string;
  customData: Record<string, string>;
  /** Payer's email, already validated and linked to the checkout server-side. */
  email: string;
  /**
   * Country detected while pricing the plan, or null when it could not be.
   * Paddle only skips its "Your details" step when both email and country
   * are prefilled, so a null here costs the payer an extra step.
   */
  countryCode: string | null;
  /** Plan length in months — carried for analytics, not for billing (the price id decides that). */
  selectedPeriod: number;
}

export function isPaddleCheckoutState(value: unknown): value is PaddleCheckoutState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as Partial<PaddleCheckoutState>;
  return (
    typeof state.priceId === 'string' &&
    state.priceId.length > 0 &&
    typeof state.email === 'string' &&
    state.email.length > 0 &&
    typeof state.customData === 'object' &&
    state.customData !== null &&
    typeof state.selectedPeriod === 'number'
  );
}
