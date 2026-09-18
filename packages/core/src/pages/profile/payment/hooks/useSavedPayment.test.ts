import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSavedMethodsStore } from '../../../../stores';
import { useSavedPayment } from './useSavedPayment';

function yookassaMethod(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pm-1',
    provider: 'yookassa',
    title: 'Visa **** 4242',
    isActive: true,
    ...overrides,
  } as never;
}

const inactive = { active: false, methods: [] };
const subscribed = { active: true, methods: [] };
const yookassa = (methods: unknown[] = []) => ({
  active: methods.some((m) => (m as { isActive: boolean }).isActive),
  methods: methods as never,
});

describe('useSavedPayment', () => {
  beforeEach(() => {
    useSavedMethodsStore.getState().actions.resetState();
  });

  it('reports no billing while the providers have not answered yet', () => {
    const { result } = renderHook(() => useSavedPayment());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasActiveMethod).toBe(false);
    expect(result.current.hasStripeSubscription).toBe(false);
    expect(result.current.hasPaddleSubscription).toBe(false);
  });

  it('reports no billing for a user none of the three providers knows', () => {
    useSavedMethodsStore.getState().actions.setBillingState({
      yookassa: yookassa(),
      stripe: inactive,
      paddle: inactive,
    });

    const { result } = renderHook(() => useSavedPayment());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasActiveMethod).toBe(false);
  });

  // The regression this hook is being fixed for: a Paddle subscriber has no row
  // in the YooKassa saved-methods list, so deriving provider flags from that
  // list reported them as having no billing at all.
  it('recognises a Paddle subscriber who has no saved YooKassa method', () => {
    useSavedMethodsStore.getState().actions.setBillingState({
      yookassa: yookassa(),
      stripe: inactive,
      paddle: subscribed,
    });

    const { result } = renderHook(() => useSavedPayment());

    expect(result.current.hasPaddleSubscription).toBe(true);
    expect(result.current.hasStripeSubscription).toBe(false);
    expect(result.current.hasActiveMethod).toBe(true);
  });

  it('recognises a Stripe subscriber who has no saved YooKassa method', () => {
    useSavedMethodsStore.getState().actions.setBillingState({
      yookassa: yookassa(),
      stripe: subscribed,
      paddle: inactive,
    });

    const { result } = renderHook(() => useSavedPayment());

    expect(result.current.hasStripeSubscription).toBe(true);
    expect(result.current.hasPaddleSubscription).toBe(false);
    expect(result.current.hasActiveMethod).toBe(true);
  });

  // An inactive subscription is a cancelled or lapsed one: there is nothing to
  // manage, so the user is offered a plan rather than a portal link.
  it('does not report a subscription the provider reports as inactive', () => {
    useSavedMethodsStore.getState().actions.setBillingState({
      yookassa: yookassa(),
      stripe: inactive,
      paddle: inactive,
    });

    const { result } = renderHook(() => useSavedPayment());

    expect(result.current.hasStripeSubscription).toBe(false);
    expect(result.current.hasActiveMethod).toBe(false);
  });

  it('recognises a YooKassa payer by their active saved method', () => {
    useSavedMethodsStore.getState().actions.setBillingState({
      yookassa: yookassa([yookassaMethod()]),
      stripe: inactive,
      paddle: inactive,
    });

    const { result } = renderHook(() => useSavedPayment());

    expect(result.current.hasActiveMethod).toBe(true);
    expect(result.current.hasStripeSubscription).toBe(false);
    expect(result.current.hasPaddleSubscription).toBe(false);
  });

  it('ignores a deactivated saved method', () => {
    useSavedMethodsStore.getState().actions.setBillingState({
      yookassa: yookassa([yookassaMethod({ isActive: false })]),
      stripe: inactive,
      paddle: inactive,
    });

    const { result } = renderHook(() => useSavedPayment());

    expect(result.current.hasActiveMethod).toBe(false);
  });

  it('exposes the saved methods for the list to render', () => {
    useSavedMethodsStore.getState().actions.setBillingState({
      yookassa: yookassa([yookassaMethod()]),
      stripe: inactive,
      paddle: inactive,
    });

    const { result } = renderHook(() => useSavedPayment());

    expect(result.current.savedMethods).toEqual([yookassaMethod()]);
  });
});
