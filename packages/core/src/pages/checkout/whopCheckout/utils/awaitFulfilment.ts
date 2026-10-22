import type { WhopPaymentStatusDto } from '@workspace/types';

/**
 * How long to wait for our webhook to extend the subscription once Whop says
 * paid. Whop reports the charge before its webhook lands, so showing success
 * on Whop's word alone would send the payer to a profile that is not yet
 * extended.
 */
const FULFILMENT_POLL_MS = 1000;
const FULFILMENT_POLL_ATTEMPTS = 60;

/**
 * Our webhook's answer once it fulfilled the payment, or null when it did not
 * within the wait; a failed lookup just asks again.
 */
export async function awaitFulfilment(
  fetchStatus: () => Promise<WhopPaymentStatusDto>,
): Promise<WhopPaymentStatusDto | null> {
  for (let attempt = 0; attempt < FULFILMENT_POLL_ATTEMPTS; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, FULFILMENT_POLL_MS));
    const status = await fetchStatus().catch(() => null);
    if (status?.fulfilled) return status;
  }
  return null;
}
