import type { IpStatusDto } from '@workspace/types';
import { useEffect, useState } from 'react';
import type { createRemnawaveApi } from '../api';

type RemnawaveApi = ReturnType<typeof createRemnawaveApi>;

/**
 * The visitor's own connection status, or `null` while unknown.
 *
 * `null` covers both "still loading" and "the request failed" on purpose —
 * both mean the banner has nothing truthful to say, and the caller treats them
 * identically.
 */
export function useIpStatus(remnawaveApi: RemnawaveApi): IpStatusDto | null {
  const [status, setStatus] = useState<IpStatusDto | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    remnawaveApi
      .getIpStatus(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setStatus(result);
      })
      .catch(() => {
        // Nothing to report and nothing to recover: the banner simply stays
        // hidden rather than showing a guess.
      });

    return () => controller.abort();
  }, [remnawaveApi]);

  return status;
}
