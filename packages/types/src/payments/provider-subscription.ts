import type { SavedMethodDto } from './yookassa/saved-method';

/**
 * One provider's billing for a user, in the shape every provider answers with.
 *
 * Read from our own `saved_payment_methods` rows, never from the provider's
 * API: the webhooks already maintain those rows (a paid invoice activates one,
 * a cancelled subscription deletes it), so the DB is the record we own and can
 * read on every page load for free.
 *
 * `methods` carries what we hold for that provider: YooKassa's saved cards,
 * which we list and delete ourselves, or the single marker row standing for a
 * Stripe/Paddle subscription, whose methods the provider manages in its own
 * portal.
 */
export interface ProviderSubscriptionDto {
  active: boolean;
  methods: SavedMethodDto[];
}

/**
 * A freshly-minted provider-hosted portal URL.
 *
 * Kept off `ProviderSubscriptionDto` deliberately: portal sessions expire and
 * only the provider can mint them, so asking for one is a live API call. It is
 * made when the user actually presses "manage", not on every profile load.
 */
export interface ProviderPortalDto {
  portalUrl: string | null;
}

/** No billing with this provider — the answer for a user it has never charged. */
export const NO_PROVIDER_SUBSCRIPTION: ProviderSubscriptionDto = { active: false, methods: [] };
