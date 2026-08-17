import type { GetSubscriptionInfoByShortUuidCommand } from '@workspace/types';
import { create } from 'zustand';

export type ExtendedSubscription = GetSubscriptionInfoByShortUuidCommand.Response['response'];

export interface ISubscriptionInfoState {
  subscription: ExtendedSubscription | null;
}

export interface ISubscriptionInfoActions {
  actions: {
    setSubscriptionInfo: (info: ISubscriptionInfoState) => void;
    getInitialState: () => ISubscriptionInfoState;
    resetState: () => void;
  };
}

const initialState: ISubscriptionInfoState = {
  subscription: null,
};

export const useSubscriptionInfoStore = create<ISubscriptionInfoActions & ISubscriptionInfoState>()(
  (set) => ({
    ...initialState,
    actions: {
      setSubscriptionInfo: (info: ISubscriptionInfoState) => {
        set((state) => ({
          ...state,
          subscription: info.subscription,
        }));
      },
      getInitialState: () => {
        return initialState;
      },
      resetState: () => {
        set({ ...initialState });
      },
    },
  }),
);

export const useSubscription = (): GetSubscriptionInfoByShortUuidCommand.Response['response'] => {
  const subscription = useSubscriptionInfoStore((state) => state.subscription);
  if (!subscription) {
    throw new Error(
      'useSubscription must be used after subscription is loaded (after RootLayout gate)',
    );
  }
  return subscription;
};
