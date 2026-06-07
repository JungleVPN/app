import type { SavedMethodDto } from '@workspace/types';
import { create } from 'zustand';

export interface ISavedMethodsState {
  savedMethods: SavedMethodDto[] | null;
}

export interface ISavedMethodsActions {
  actions: {
    setSavedMethods: (methods: SavedMethodDto[]) => void;
    getInitialState: () => ISavedMethodsState;
    resetState: () => void;
  };
}

const initialState: ISavedMethodsState = {
  savedMethods: null,
};

export const useSavedMethodsStore = create<ISavedMethodsActions & ISavedMethodsState>()((set) => ({
  ...initialState,
  actions: {
    setSavedMethods: (savedMethods) => set({ savedMethods }),
    getInitialState: () => initialState,
    resetState: () => set({ ...initialState }),
  },
}));

export const useSavedMethodsStoreActions = () => useSavedMethodsStore((store) => store.actions);

/** Returns `savedMethods` directly so the selector stays referentially stable (unlike `{ savedMethods }`). */
export const useSavedMethodsStoreInfo = () => useSavedMethodsStore((state) => state.savedMethods);
