/**
 * Fetching the visitor's connection status for the landing-page banner.
 *
 * The banner sits above the fold on every landing route, so this hook has to
 * be safe to mount and unmount freely, and has to fail silently: a banner that
 * never appears is a non-event, a banner that wrongly says "not protected" is
 * a support ticket from a paying customer.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useIpStatus } from './use-ip-status';

const STATUS = { ip: '81.84.17.141', countryCode: 'PT', protected: false };

const api = (result: unknown = STATUS) => ({
  getIpStatus:
    result instanceof Error ? vi.fn().mockRejectedValue(result) : vi.fn().mockResolvedValue(result),
});

describe('useIpStatus', () => {
  it('has nothing to show before the request comes back', () => {
    const { result } = renderHook(() => useIpStatus(api() as never));

    expect(result.current).toBeNull();
  });

  it('exposes the status the backend reported', async () => {
    const { result } = renderHook(() => useIpStatus(api() as never));

    await waitFor(() => expect(result.current).toEqual(STATUS));
  });

  it('stays silent when the request fails, rather than guessing', async () => {
    const remnawaveApi = api(new Error('offline'));

    const { result } = renderHook(() => useIpStatus(remnawaveApi as never));

    await waitFor(() => expect(remnawaveApi.getIpStatus).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it('asks once per mount, not once per render', async () => {
    const remnawaveApi = api();

    const { rerender } = renderHook(() => useIpStatus(remnawaveApi as never));
    rerender();
    rerender();

    await waitFor(() => expect(remnawaveApi.getIpStatus).toHaveBeenCalledTimes(1));
  });

  it('abandons an in-flight request when the visitor navigates away', async () => {
    const remnawaveApi = api();

    const { unmount } = renderHook(() => useIpStatus(remnawaveApi as never));
    unmount();

    const signal = remnawaveApi.getIpStatus.mock.calls[0]?.[0] as AbortSignal;
    expect(signal.aborted).toBe(true);
  });
});
