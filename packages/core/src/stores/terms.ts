import { create } from 'zustand';

interface ITermsState {
  isOpen: boolean;
}

interface ITermsActions {
  open: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
}

export const useTermsStore = create<ITermsState & ITermsActions>()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setOpen: (isOpen) => set({ isOpen }),
}));
