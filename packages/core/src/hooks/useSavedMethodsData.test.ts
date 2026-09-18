import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSavedMethodsStore } from '../stores';
import { useSavedMethodsData } from './useSavedMethodsData';

const getYookassaSavedMethods = vi.fn();
const getStripeSubscription = vi.fn();
const getPaddleSubscription = vi.fn();

vi.mock('../runtime', () => ({
  usePaymentsApi: () => ({
    getYookassaSavedMethods,
    getStripeSubscription,
    getPaddleSubscription,
  }),
}));

function yookassaMethod(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pm-1',
    provider: 'yookassa',
    isActive: true,
    ...overrides,
  } as never;
}

let userId = 0;
/** Each test needs a userId the module-level in-flight set has never seen. */
const nextUserId = () => ++userId + 5000;

describe('useSavedMethodsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSavedMethodsStore.getState().actions.resetState();
    getYookassaSavedMethods.mockResolvedValue([yookassaMethod()]);
    getStripeSubscription.mockResolvedValue({ active: false, methods: [] });
    getPaddleSubscription.mockResolvedValue({ active: false, methods: [] });
  });

  it('asks all three providers whether the user has billing with them', async () => {
    renderHook(() => useSavedMethodsData(nextUserId()));

    await waitFor(() => expect(useSavedMethodsStore.getState().isLoaded).toBe(true));

    expect(getYookassaSavedMethods).toHaveBeenCalledTimes(1);
    expect(getStripeSubscription).toHaveBeenCalledTimes(1);
    expect(getPaddleSubscription).toHaveBeenCalledTimes(1);
  });

  it('stores the Paddle subscription so a Paddle subscriber is not treated as having no billing', async () => {
    getYookassaSavedMethods.mockResolvedValue([]);
    getPaddleSubscription.mockResolvedValue({ active: true, methods: [] });

    renderHook(() => useSavedMethodsData(nextUserId()));

    await waitFor(() => expect(useSavedMethodsStore.getState().isLoaded).toBe(true));

    expect(useSavedMethodsStore.getState().paddle).toEqual({ active: true, methods: [] });
  });

  it('stores the Stripe subscription instead of discarding the response', async () => {
    getYookassaSavedMethods.mockResolvedValue([]);
    getStripeSubscription.mockResolvedValue({ active: true, methods: [] });

    renderHook(() => useSavedMethodsData(nextUserId()));

    await waitFor(() => expect(useSavedMethodsStore.getState().isLoaded).toBe(true));

    expect(useSavedMethodsStore.getState().stripe).toEqual({ active: true, methods: [] });
  });

  it('stores the YooKassa saved methods', async () => {
    renderHook(() => useSavedMethodsData(nextUserId()));

    await waitFor(() => expect(useSavedMethodsStore.getState().isLoaded).toBe(true));

    expect(useSavedMethodsStore.getState().yookassa).toEqual({
      active: true,
      methods: [yookassaMethod()],
    });
  });

  // One provider being down must not hide the billing the other two reported,
  // and must not leave the UI stuck on its loading state forever.
  it('finishes loading when a provider request fails', async () => {
    getStripeSubscription.mockRejectedValue(new Error('stripe down'));
    getPaddleSubscription.mockResolvedValue({ active: true, methods: [] });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    renderHook(() => useSavedMethodsData(nextUserId()));

    await waitFor(() => expect(useSavedMethodsStore.getState().isLoaded).toBe(true));

    expect(useSavedMethodsStore.getState().stripe).toEqual({ active: false, methods: [] });
    expect(useSavedMethodsStore.getState().paddle.active).toBe(true);
  });

  it('does nothing until the user id is known', async () => {
    renderHook(() => useSavedMethodsData(undefined));

    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(getYookassaSavedMethods).not.toHaveBeenCalled();
    expect(getStripeSubscription).not.toHaveBeenCalled();
    expect(getPaddleSubscription).not.toHaveBeenCalled();
    expect(useSavedMethodsStore.getState().isLoaded).toBe(false);
  });

  it('does not refetch once the providers have already answered', async () => {
    const id = nextUserId();
    const { unmount } = renderHook(() => useSavedMethodsData(id));
    await waitFor(() => expect(useSavedMethodsStore.getState().isLoaded).toBe(true));
    unmount();

    renderHook(() => useSavedMethodsData(id));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(getYookassaSavedMethods).toHaveBeenCalledTimes(1);
  });

  // A user with no billing at all answers []/inactive — indistinguishable from
  // "not fetched yet" without an explicit loaded flag, which would make the
  // hook refetch on every mount.
  it('treats an empty answer from every provider as loaded', async () => {
    getYookassaSavedMethods.mockResolvedValue([]);

    renderHook(() => useSavedMethodsData(nextUserId()));

    await waitFor(() => expect(useSavedMethodsStore.getState().isLoaded).toBe(true));
    expect(useSavedMethodsStore.getState().yookassa).toEqual({ active: false, methods: [] });
  });
});
