import type { SubscriptionPlanDto } from '@workspace/types';
import { create } from 'zustand';

/** `idle` → nothing requested yet; the first `usePlans()` consumer starts the fetch. */
export type PlansStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface IPlansState {
  plans: SubscriptionPlanDto[];
  status: PlansStatus;
}

export interface IPlansActions {
  actions: {
    setPlans: (plans: SubscriptionPlanDto[]) => void;
    setStatus: (status: PlansStatus) => void;
    getInitialState: () => IPlansState;
    resetState: () => void;
  };
}

const initialState: IPlansState = {
  plans: [],
  status: 'idle',
};

/**
 * Plans are fetched once per session (on landing load) and shared from here, so
 * checkout can render pricing without a second round trip.
 */
export const usePlansStore = create<IPlansActions & IPlansState>()((set) => ({
  ...initialState,
  actions: {
    setPlans: (plans) => set({ plans, status: 'loaded' }),
    setStatus: (status) => set({ status }),
    getInitialState: () => initialState,
    resetState: () => set({ ...initialState }),
  },
}));

export const usePlansStoreActions = () => usePlansStore((store) => store.actions);

/** Returns the array directly so the selector stays referentially stable. */
export const usePlansStoreInfo = () => usePlansStore((state) => state.plans);

export const usePlansStatus = () => usePlansStore((state) => state.status);

/** Looks up a plan by its subscription length; `undefined` until plans load. */
export const usePlanByMonths = (months: number | null) =>
  usePlansStore((state) =>
    months === null ? undefined : state.plans.find((plan) => plan.months === months),
  );
