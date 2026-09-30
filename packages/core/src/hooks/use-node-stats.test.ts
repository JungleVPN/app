/**
 * Fetching live node statistics for the landing page's Stats section.
 *
 * Unlike the IP banner, the section has three honest states — still loading
 * (show placeholders), failed (show nothing), and ready — so the hook keeps
 * them apart instead of folding the first two into `null`.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { NodeStatDto } from '@workspace/types';
import { describe, expect, it, vi } from 'vitest';
import { useNodeStats } from './use-node-stats';

const NODES: NodeStatDto[] = [
  {
    name: 'Vienna',
    isConnected: true,
    countryCode: 'AT',
    uptime: 86_400,
    memoryUsed: 5_000,
    memoryTotal: 8_000,
    cpuLoad: 0.25,
  },
];

const api = (result: unknown = NODES) => ({
  getNodeStats:
    result instanceof Error ? vi.fn().mockRejectedValue(result) : vi.fn().mockResolvedValue(result),
});

describe('useNodeStats', () => {
  it('is loading before the request comes back', () => {
    const { result } = renderHook(() => useNodeStats(api() as never));

    expect(result.current).toEqual({ status: 'loading' });
  });

  it('exposes the nodes the backend reported', async () => {
    const { result } = renderHook(() => useNodeStats(api() as never));

    await waitFor(() => expect(result.current).toEqual({ status: 'ready', nodes: NODES }));
  });

  it('reports a failed request as an error rather than an empty list', async () => {
    const { result } = renderHook(() => useNodeStats(api(new Error('offline')) as never));

    await waitFor(() => expect(result.current).toEqual({ status: 'error' }));
  });

  it('asks once per mount, not once per render', async () => {
    const remnawaveApi = api();

    const { rerender } = renderHook(() => useNodeStats(remnawaveApi as never));
    rerender();
    rerender();

    await waitFor(() => expect(remnawaveApi.getNodeStats).toHaveBeenCalledTimes(1));
  });

  it('cancels the request when the section unmounts', () => {
    const remnawaveApi = api();

    const { unmount } = renderHook(() => useNodeStats(remnawaveApi as never));
    unmount();

    const [signal] = remnawaveApi.getNodeStats.mock.calls[0] as [AbortSignal];
    expect(signal.aborted).toBe(true);
  });
});
