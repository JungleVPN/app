import { create } from 'zustand';

interface ISubscriptionLinkDialogState {
  isOpen: boolean;
}

interface ISubscriptionLinkDialogActions {
  open: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
}

export const useSubscriptionLinkDialogStore = create<
  ISubscriptionLinkDialogState & ISubscriptionLinkDialogActions
>()((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setOpen: (isOpen) => set({ isOpen }),
}));
