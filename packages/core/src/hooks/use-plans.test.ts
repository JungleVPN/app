import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlansStore } from '../stores';
import { usePlans } from './use-plans';

vi.mock('../env', () => ({ coreEnv: { paymentsUrl: 'https://payments.test' } }));

const plan = { months: 12 } as never;

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  usePlansStore.setState(usePlansStore.getState().actions.getInitialState());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const resolvesWith = (data: unknown) => fetchMock.mockResolvedValue({ json: async () => data });

describe('usePlans', () => {
  it('fetches the plans once and shares them through the store', async () => {
    resolvesWith([plan]);

    const { result } = renderHook(() => usePlans());

    await waitFor(() => expect(result.current).toEqual([plan]));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(usePlansStore.getState().status).toBe('loaded');
  });

  it('reuses the loaded plans instead of asking again for every consumer', async () => {
    resolvesWith([plan]);

    const { result } = renderHook(() => usePlans());
    await waitFor(() => expect(result.current).toEqual([plan]));

    renderHook(() => usePlans());

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stops after a failed request instead of retrying it for as long as the page is open', async () => {
    fetchMock.mockRejectedValue(new Error('payments unreachable'));

    renderHook(() => usePlans());

    await waitFor(() => expect(usePlansStore.getState().status).toBe('error'));
    // The failure must not feed itself back into the effect: without this the
    // hook re-requests as fast as the network can fail, for every open page.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries when a later page mounts a fresh consumer after a failure', async () => {
    fetchMock.mockRejectedValue(new Error('payments unreachable'));
    const first = renderHook(() => usePlans());
    await waitFor(() => expect(usePlansStore.getState().status).toBe('error'));
    first.unmount();

    resolvesWith([plan]);
    const { result } = renderHook(() => usePlans());

    await waitFor(() => expect(result.current).toEqual([plan]));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
