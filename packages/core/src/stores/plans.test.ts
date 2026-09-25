import { renderHook } from '@testing-library/react';
import type { SubscriptionPlanDto } from '@workspace/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePlanById, usePlansStore } from './plans';

const plan = (planId: string, days: number): SubscriptionPlanDto => ({
  planId,
  days,
  countryCode: null,
  isTrial: false,
  planPricing: {
    total: '6',
    monthly: '6',
    fullTotal: null,
    discountPercent: 0,
    currencyCode: 'EUR',
  },
});

describe('usePlanById', () => {
  beforeEach(() => {
    usePlansStore.getState().actions.setPlans([plan('month', 30), plan('year', 365)]);
  });

  it('finds the plan a checkout URL names', () => {
    const { result } = renderHook(() => usePlanById('year'));

    expect(result.current?.days).toBe(365);
  });

  it('finds nothing for an unknown id or no id at all', () => {
    expect(renderHook(() => usePlanById('gone')).result.current).toBeUndefined();
    expect(renderHook(() => usePlanById(undefined)).result.current).toBeUndefined();
  });
});
