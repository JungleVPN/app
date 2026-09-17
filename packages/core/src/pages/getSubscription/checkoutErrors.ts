import { ACTIVE_SUBSCRIPTION_CODE } from '@workspace/types';
import { ApiClientError } from '../../api';

/** Whether the backend refused the checkout because the caller was rate limited. */
export function isThrottledError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 429;
}

/**
 * Whether the backend refused the checkout because the payer email already has
 * an active subscription, rather than because the checkout failed to prepare.
 */
export function isActiveSubscriptionError(error: unknown): boolean {
  if (!(error instanceof ApiClientError) || error.status !== 409) return false;

  const data = error.data;
  // The code is what identifies the case; a 409 from this endpoint means only
  // this today, so an unparsed body is still treated as it.
  if (typeof data !== 'object' || data === null) return true;
  return (data as { code?: string }).code === ACTIVE_SUBSCRIPTION_CODE;
}
