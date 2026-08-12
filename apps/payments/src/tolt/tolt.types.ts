/**
 * Types for the subset of the Tolt API this integration uses.
 *
 * Only the three endpoints on the attribution chain are modelled — clicks are
 * handled by `tlt.js` in the browser, and commissions are derived by the Tolt
 * program flow rather than posted by us.
 */

/** Every Tolt response wraps its payload in a single-element array. */
export type ToltEnvelope<T> = {
  success: boolean;
  data: T[];
};

export type ToltCustomerStatus = 'lead' | 'trialing' | 'active' | 'canceled';

export type ToltCreateCustomerInput = {
  /**
   * Tolt's identifier for the customer. Named `email` by the API but documented
   * as accepting "an email or a unique ID" — we pass the remnawave userId when
   * the user has no email, which is common for Telegram-only signups.
   */
  email: string;
  partner_id: string;
  customer_id?: string;
  click_id?: string | null;
  name?: string;
  status?: ToltCustomerStatus;
  lead_at?: string;
  active_at?: string;
};

export type ToltCustomer = {
  id: string;
  customer_id: string | null;
  email: string | null;
  status: ToltCustomerStatus | null;
  partner_id: string;
  program_id: string;
};

export type ToltCreateTransactionInput = {
  /** Minor units of the program's currency (EUR cents). */
  amount: number;
  customer_id: string;
  /**
   * Always `subscription`. Tolt's API also accepts `one_time`, but the only
   * one-off purchase we sell — an extra device — earns no commission and is
   * never reported, so the case is deliberately not representable here.
   *
   * Not merely cosmetic: it tells Tolt to treat later charges from the same
   * customer as renewals, which is what drives the recurring (30%) rate rather
   * than the first-payment (60%) one.
   */
  billing_type?: 'subscription';
  /** The provider's charge id — our correlation key against a payment. */
  charge_id?: string;
  click_id?: string | null;
  product_name?: string;
  /** Which provider settled the charge, e.g. `stripe` or `yookassa`. */
  source?: string;
  /**
   * Tolt accepts only `month` or `year`, which cannot express the 3- and
   * 6-month plans. Sent only when exactly true (1 → month, 12 → year) and
   * omitted otherwise: the field is optional, and a wrong interval would have
   * Tolt project renewal dates that never arrive.
   */
  interval?: 'month' | 'year';
  created_at?: string;
};

export type ToltTransaction = {
  id: string;
  amount: string;
  currency: string | null;
  status: string;
  charge_id: string | null;
  customer_id: string;
  partner_id: string;
};
