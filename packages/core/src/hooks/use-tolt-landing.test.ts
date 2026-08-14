import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readToltAttribution } from '../utils';
import { useToltLanding } from './use-tolt-landing';

function api(resolved: unknown = { partnerId: 'part_z', clickId: 'clk_1' }) {
  return {
    recordToltClick:
      resolved instanceof Error
        ? vi.fn().mockRejectedValue(resolved)
        : vi.fn().mockResolvedValue(resolved),
  };
}

function land(search: string) {
  window.history.replaceState({}, '', search);
}

function clearCookies() {
  for (const cookie of document.cookie.split('; ')) {
    const name = cookie.split('=')[0];
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

beforeEach(() => {
  clearCookies();
  window.tolt_referral = null;
  window.tolt_data = null;
  land('/');
});

describe('useToltLanding', () => {
  it('records the click and stores the partner it resolves to', async () => {
    land('/?aff=zaira');
    const paymentsApi = api();

    renderHook(() => useToltLanding(paymentsApi as never));

    await waitFor(() =>
      expect(paymentsApi.recordToltClick).toHaveBeenCalledWith(
        expect.objectContaining({ affCode: 'zaira' }),
      ),
    );
    await waitFor(() =>
      expect(readToltAttribution()).toMatchObject({
        referralCode: 'zaira',
        partnerId: 'part_z',
      }),
    );
  });

  it('does nothing for a visitor who arrived without a referral link', async () => {
    const paymentsApi = api();

    renderHook(() => useToltLanding(paymentsApi as never));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(paymentsApi.recordToltClick).not.toHaveBeenCalled();
  });

  // Reloading a partner's link must not keep crediting them with clicks.
  it('does not record a second click for a code already stored', async () => {
    land('/?aff=zaira');
    const first = api();
    renderHook(() => useToltLanding(first as never));
    await waitFor(() => expect(first.recordToltClick).toHaveBeenCalledTimes(1));

    const second = api();
    renderHook(() => useToltLanding(second as never));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(second.recordToltClick).not.toHaveBeenCalled();
  });

  it('replaces a stored partner when a newer link is followed', async () => {
    land('/?aff=in1');
    renderHook(() => useToltLanding(api({ partnerId: 'part_in1', clickId: 'c1' }) as never));
    await waitFor(() => expect(readToltAttribution()?.referralCode).toBe('in1'));

    land('/?aff=in2');
    renderHook(() => useToltLanding(api({ partnerId: 'part_in2', clickId: 'c2' }) as never));

    await waitFor(() =>
      expect(readToltAttribution()).toMatchObject({
        referralCode: 'in2',
        partnerId: 'part_in2',
      }),
    );
  });

  it('stores nothing when the code is not a partner’s', async () => {
    land('/?aff=mistyped');
    const paymentsApi = api(new Error('404 Unknown referral code'));

    renderHook(() => useToltLanding(paymentsApi as never));

    await waitFor(() => expect(paymentsApi.recordToltClick).toHaveBeenCalled());
    expect(readToltAttribution()).toBeNull();
  });

  it('never throws — a landing page must render regardless', async () => {
    land('/?aff=zaira');
    const paymentsApi = api(new Error('network down'));

    expect(() => renderHook(() => useToltLanding(paymentsApi as never))).not.toThrow();
    await waitFor(() => expect(paymentsApi.recordToltClick).toHaveBeenCalled());
  });
});
