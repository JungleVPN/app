import { useEffect } from 'react';
import type { createPaymentsApi } from '../api';
import { readToltAttribution } from '../utils';

const POLL_INTERVAL_MS = 200;
const POLL_TIMEOUT_MS = 5_000;

/**
 * Persists the browser's affiliate attribution against the authenticated user.
 */
export function useToltCapture(
  userId: number | undefined,
  paymentsApi: ReturnType<typeof createPaymentsApi>,
): void {
  useEffect(() => {
    if (!userId) return;

    const deadline = Date.now() + POLL_TIMEOUT_MS;

    /** Sends if attribution is available. Returns whether polling should stop. */
    const attempt = (): boolean => {
      const attribution = readToltAttribution();
      if (attribution) {
        void paymentsApi.captureToltReferral(attribution).catch(() => {});
        return true;
      }
      return Date.now() >= deadline;
    };

    if (attempt()) return;

    const timer = setInterval(() => {
      if (attempt()) clearInterval(timer);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [userId, paymentsApi]);
}
