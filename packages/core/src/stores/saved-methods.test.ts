import { beforeEach, describe, expect, it } from 'vitest';
import { selectHasActiveBilling, useSavedMethodsStore } from './saved-methods';

const method = (overrides: Record<string, unknown> = {}) =>
  ({ id: 'pm-1', provider: 'yookassa', isActive: true, ...overrides }) as never;

const inactive = { active: false, methods: [] };

describe('saved methods store', () => {
  beforeEach(() => {
    useSavedMethodsStore.getState().actions.resetState();
  });

  // Requirement of the uniform shape: YooKassa is the one provider whose
  // methods we hold as a list, so its `active` has to be derived from them
  // rather than reported by the endpoint.
  describe('setYookassaMethods', () => {
    it('derives an active subscription from an active saved card', () => {
      useSavedMethodsStore.getState().actions.setYookassaMethods([method()]);

      expect(useSavedMethodsStore.getState().yookassa).toEqual({
        active: true,
        methods: [method()],
      });
    });

    it('derives no subscription when every saved card is deactivated', () => {
      useSavedMethodsStore.getState().actions.setYookassaMethods([method({ isActive: false })]);

      expect(useSavedMethodsStore.getState().yookassa.active).toBe(false);
    });

    it('derives no subscription when the last card has been deleted', () => {
      useSavedMethodsStore.getState().actions.setYookassaMethods([method()]);
      useSavedMethodsStore.getState().actions.setYookassaMethods([]);

      expect(useSavedMethodsStore.getState().yookassa).toEqual({ active: false, methods: [] });
    });

    it('leaves the other providers untouched', () => {
      useSavedMethodsStore.getState().actions.setBillingState({
        yookassa: inactive,
        stripe: { active: true, methods: [] },
        paddle: inactive,
      });

      useSavedMethodsStore.getState().actions.setYookassaMethods([method()]);

      expect(useSavedMethodsStore.getState().stripe.active).toBe(true);
    });
  });

  describe('selectHasActiveBilling', () => {
    it('is true when any single provider reports a subscription', () => {
      expect(
        selectHasActiveBilling({ yookassa: inactive, stripe: inactive, paddle: inactive }),
      ).toBe(false);
      expect(
        selectHasActiveBilling({
          yookassa: { active: true, methods: [method()] },
          stripe: inactive,
          paddle: inactive,
        }),
      ).toBe(true);
      expect(
        selectHasActiveBilling({
          yookassa: inactive,
          stripe: { active: true, methods: [] },
          paddle: inactive,
        }),
      ).toBe(true);
      expect(
        selectHasActiveBilling({
          yookassa: inactive,
          stripe: inactive,
          paddle: { active: true, methods: [] },
        }),
      ).toBe(true);
    });
  });

  it('starts unloaded, with every provider reporting no billing', () => {
    const state = useSavedMethodsStore.getState();

    expect(state.isLoaded).toBe(false);
    expect(state.yookassa).toEqual(inactive);
    expect(state.stripe).toEqual(inactive);
    expect(state.paddle).toEqual(inactive);
  });

  it('marks billing loaded once every provider has answered', () => {
    useSavedMethodsStore
      .getState()
      .actions.setBillingState({ yookassa: inactive, stripe: inactive, paddle: inactive });

    expect(useSavedMethodsStore.getState().isLoaded).toBe(true);
  });
});
