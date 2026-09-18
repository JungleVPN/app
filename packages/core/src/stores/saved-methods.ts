import { NO_PROVIDER_SUBSCRIPTION, type ProviderSubscriptionDto } from '@workspace/types';
import { create } from 'zustand';

/**
 * The user's billing, one uniform entry per provider.
 *
 * Every provider answers the same `{ active, methods }` shape, so nothing here
 * has to special-case one of them. They are kept apart rather than merged into
 * a single list because "which provider is this user subscribed through"
 * decides what the UI can offer: YooKassa methods we list and delete ourselves,
 * while Stripe and Paddle are managed in the provider's own portal.
 */
export interface IBillingState {
  yookassa: ProviderSubscriptionDto;
  stripe: ProviderSubscriptionDto;
  paddle: ProviderSubscriptionDto;
}

export interface ISavedMethodsState extends IBillingState {
  /**
   * True once every provider has answered, however it answered. A user with no
   * billing anywhere answers inactive/empty, which is indistinguishable from
   * "not fetched yet" without this flag.
   */
  isLoaded: boolean;
}

export interface ISavedMethodsActions {
  actions: {
    setBillingState: (billing: IBillingState) => void;
    /** Replaces the YooKassa methods after we add or delete one ourselves. */
    setYookassaMethods: (methods: ProviderSubscriptionDto['methods']) => void;
    getInitialState: () => ISavedMethodsState;
    resetState: () => void;
  };
}

const initialState: ISavedMethodsState = {
  yookassa: NO_PROVIDER_SUBSCRIPTION,
  stripe: NO_PROVIDER_SUBSCRIPTION,
  paddle: NO_PROVIDER_SUBSCRIPTION,
  isLoaded: false,
};

/** The uniform shape, derived for the provider whose methods we hold ourselves. */
export function toProviderSubscription(
  methods: ProviderSubscriptionDto['methods'],
): ProviderSubscriptionDto {
  return { active: methods.some((method) => method.isActive), methods };
}

export const useSavedMethodsStore = create<ISavedMethodsActions & ISavedMethodsState>()((set) => ({
  ...initialState,
  actions: {
    setBillingState: (billing) => set({ ...billing, isLoaded: true }),
    setYookassaMethods: (methods) => set({ yookassa: toProviderSubscription(methods) }),
    getInitialState: () => initialState,
    resetState: () => set({ ...initialState }),
  },
}));

export const useSavedMethodsStoreActions = () => useSavedMethodsStore((store) => store.actions);

export const useYookassaSubscription = () => useSavedMethodsStore((state) => state.yookassa);
export const useStripeSubscription = () => useSavedMethodsStore((state) => state.stripe);
export const usePaddleSubscription = () => useSavedMethodsStore((state) => state.paddle);

export const useIsBillingLoaded = () => useSavedMethodsStore((state) => state.isLoaded);

/** Selects a primitive, so every caller of this shared gate re-renders on real changes only. */
export const useHasActiveBilling = () => useSavedMethodsStore(selectHasActiveBilling);

export function selectHasActiveBilling(state: IBillingState): boolean {
  return state.yookassa.active || state.stripe.active || state.paddle.active;
}
