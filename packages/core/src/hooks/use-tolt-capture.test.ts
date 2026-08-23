import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToltCapture } from './use-tolt-capture';

const USER = 4821;

function api() {
  return { captureToltReferral: vi.fn().mockResolvedValue({ ok: true }) };
}

function attributed() {
  window.tolt_referral = 'jimhalpert';
  window.tolt_data = { partner_id: 'part_xyz', click_id: 'clk_1' };
}

beforeEach(() => {
  window.tolt_referral = null;
  window.tolt_data = null;
});

describe('useToltCapture', () => {
  it('sends the attribution once the user is known', async () => {
    attributed();
    const paymentsApi = api();

    renderHook(() => useToltCapture(USER, paymentsApi as never));

    await waitFor(() =>
      expect(paymentsApi.captureToltReferral).toHaveBeenCalledWith({
        referralCode: 'jimhalpert',
        partnerId: 'part_xyz',
        clickId: 'clk_1',
      }),
    );
  });

  it('does nothing until a user id is available', async () => {
    attributed();
    const paymentsApi = api();

    renderHook(() => useToltCapture(undefined, paymentsApi as never));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(paymentsApi.captureToltReferral).not.toHaveBeenCalled();
  });

  it('does nothing for a visitor who was never referred', async () => {
    const paymentsApi = api();

    renderHook(() => useToltCapture(USER, paymentsApi as never));

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(paymentsApi.captureToltReferral).not.toHaveBeenCalled();
  });

  it('waits for tlt.js, which populates its globals only after a network call', async () => {
    const paymentsApi = api();

    renderHook(() => useToltCapture(USER, paymentsApi as never));

    // Nothing to read on mount — the /clicks round-trip is still in flight.
    expect(paymentsApi.captureToltReferral).not.toHaveBeenCalled();

    attributed();

    await waitFor(() => expect(paymentsApi.captureToltReferral).toHaveBeenCalledTimes(1));
  });

  it('sends only once across re-renders', async () => {
    attributed();
    const paymentsApi = api();

    const { rerender } = renderHook(() => useToltCapture(USER, paymentsApi as never));
    await waitFor(() => expect(paymentsApi.captureToltReferral).toHaveBeenCalledTimes(1));

    rerender();
    rerender();

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(paymentsApi.captureToltReferral).toHaveBeenCalledTimes(1);
  });

  // Nothing is remembered between visits: the backend keeps the first affiliate
  // and ignores repeats, so resending is a cheap no-op there — and it means a
  // capture that failed, or a row that was deleted, recovers on the next load
  // rather than being blocked by stale client-side state.
  it('sends again on a later visit', async () => {
    attributed();
    const first = api();
    const { unmount } = renderHook(() => useToltCapture(USER, first as never));
    await waitFor(() => expect(first.captureToltReferral).toHaveBeenCalledTimes(1));
    unmount();

    const second = api();
    renderHook(() => useToltCapture(USER, second as never));

    await waitFor(() => expect(second.captureToltReferral).toHaveBeenCalledTimes(1));
  });

  it('never rejects when the request fails — capture must not break the page', async () => {
    attributed();
    const failing = {
      captureToltReferral: vi.fn().mockRejectedValue(new Error('offline')),
    };

    expect(() => renderHook(() => useToltCapture(USER, failing as never))).not.toThrow();
    await waitFor(() => expect(failing.captureToltReferral).toHaveBeenCalled());
  });
});
