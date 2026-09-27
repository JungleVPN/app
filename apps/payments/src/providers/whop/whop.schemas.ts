import { z } from 'zod';

/**
 * Whop's SDK verifies a webhook's signature but hands back an untyped body —
 * it ships no event models. These schemas are the trust boundary: they parse
 * only the fields we act on, so a payload Whop changes under us fails loudly
 * (and Whop redelivers) instead of being fulfilled from `undefined`s.
 */

export const WhopWebhookEnvelopeSchema = z.object({
  type: z.string(),
  data: z.unknown(),
});

/** What checkout stamps on every payment and membership (see `WhopProvider.createCheckout`). */
const WhopMetadataSchema = z
  .object({
    email: z.string().optional(),
    inviterId: z.string().optional(),
    toltReferralId: z.string().optional(),
    signupOrigin: z.string().optional(),
  })
  .nullable();

export const WhopPaymentSchema = z.object({
  id: z.string(),
  /** `paid` once the money is collected; `payment.created` can already carry it. */
  status: z.string().nullish(),
  /** Major units, excluding buyer fees. */
  total: z.number().nullable(),
  /** Lowercase ISO code, e.g. `eur`. */
  currency: z.string(),
  /** `subscription_cycle` marks a renewal; `subscription_create` the first charge. */
  billing_reason: z.string().nullable(),
  metadata: WhopMetadataSchema,
  plan: z.object({ id: z.string() }).nullable(),
  membership: z.object({ id: z.string() }).nullable(),
  user: z.object({ id: z.string(), email: z.string().nullable() }).nullable(),
  /** ISO date-time; the docs also call it a Unix timestamp, so seconds are accepted too. */
  paid_at: z.union([z.string(), z.number()]).nullish(),
  product: z.object({ title: z.string() }).nullish(),
  card_brand: z.string().nullish(),
  card_last4: z.string().nullish(),
  card_exp_month: z.number().nullish(),
  card_exp_year: z.number().nullish(),
  /** `display_name` is buyer-facing, e.g. "Visa •••• 4242". */
  payment_instrument: z.object({ display_name: z.string() }).nullish(),
});

export const WhopMembershipSchema = z.object({
  id: z.string(),
  status: z.string(),
});

export const WhopRefundSchema = z.object({
  id: z.string(),
  /** Major units of `currency`. */
  amount: z.number(),
  /** Lowercase ISO code, e.g. `eur`. */
  currency: z.string(),
  /** `pending`, `requires_action`, `succeeded`, `failed` or `canceled`. */
  status: z.string(),
  /** The payment refunded; null once Whop no longer has it. */
  payment: z.object({ id: z.string() }).nullable(),
});

export type WhopWebhookEnvelope = z.infer<typeof WhopWebhookEnvelopeSchema>;
export type WhopPaymentData = z.infer<typeof WhopPaymentSchema>;
export type WhopMembershipData = z.infer<typeof WhopMembershipSchema>;
export type WhopRefundData = z.infer<typeof WhopRefundSchema>;
