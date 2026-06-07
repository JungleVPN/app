import type { SavedMethodDto, StripeSubscriptionStatusDto } from '@workspace/types';
import { create } from 'zustand';

export interface ISavedMethodsState {
  savedMethods: SavedMethodDto[] | null;
  /** Active-Stripe-subscription status, resolved once on page init. `null` = not yet loaded. */
  stripeSubscription: StripeSubscriptionStatusDto | null;
}

export interface ISavedMethodsActions {
  actions: {
    setSavedMethods: (methods: SavedMethodDto[]) => void;
    setStripeSubscription: (status: StripeSubscriptionStatusDto) => void;
    getInitialState: () => ISavedMethodsState;
    resetState: () => void;
  };
}

const initialState: ISavedMethodsState = {
  savedMethods: null,
  stripeSubscription: null,
};

export const useSavedMethodsStore = create<ISavedMethodsActions & ISavedMethodsState>()(
  (set) => ({
    ...initialState,
    actions: {
      setSavedMethods: (savedMethods) => set({ savedMethods }),
      setStripeSubscription: (stripeSubscription) => set({ stripeSubscription }),
      getInitialState: () => initialState,
      resetState: () => set({ ...initialState }),
    },
  }),
);

export const useSavedMethodsStoreActions = () =>
  useSavedMethodsStore((store) => store.actions);

/** Returns `savedMethods` directly so the selector stays referentially stable (unlike `{ savedMethods }`). */
export const useSavedMethodsStoreInfo = () =>
  useSavedMethodsStore((state) => state.savedMethods);

/** Active-Stripe-subscription status from the store. `null` while still loading. */
export const useStripeSubscriptionInfo = () =>
  useSavedMethodsStore((state) => state.stripeSubscription);
