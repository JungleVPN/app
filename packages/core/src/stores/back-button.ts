import { create } from 'zustand';

export interface IBackButtonState {
  /**
   * The back handler registered by the currently mounted page, or null when
   * no page has configured `useBackButton`. Drives the web back button in
   * `Page` and mirrors what the Telegram back button does on TMA.
   */
  onBack: (() => void) | null;
}

export interface IBackButtonActions {
  actions: {
    setOnBack: (handler: () => void) => void;
    /** Clears only if `handler` is still the registered one — unmount of an
     * outgoing page must not wipe the handler of the page replacing it. */
    clearOnBack: (handler: () => void) => void;
  };
}

const initialState: IBackButtonState = {
  onBack: null,
};

export const useBackButtonStore = create<IBackButtonActions & IBackButtonState>()((set) => ({
  ...initialState,
  actions: {
    setOnBack: (onBack) => set({ onBack }),
    clearOnBack: (handler) => set((state) => (state.onBack === handler ? { onBack: null } : state)),
  },
}));

export const useBackButtonStoreActions = () => useBackButtonStore((state) => state.actions);
export const useBackHandler = () => useBackButtonStore((state) => state.onBack);
