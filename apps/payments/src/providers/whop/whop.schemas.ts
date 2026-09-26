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
});

export type WhopWebhookEnvelope = z.infer<typeof WhopWebhookEnvelopeSchema>;
export type WhopPaymentData = z.infer<typeof WhopPaymentSchema>;
