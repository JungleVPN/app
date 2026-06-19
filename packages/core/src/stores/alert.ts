import { create } from 'zustand';

const AUTO_CLEAR_MS = 3000;

export type AlertVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger';

export interface AppAlert {
  messageKey: string;
  variant: AlertVariant;
}

interface IAlertState {
  alert: AppAlert | null;
}

interface IAlertActions {
  show: (messageKey: string, variant?: AlertVariant) => void;
  clear: () => void;
}

let clearTimer: ReturnType<typeof setTimeout> | null = null;

export const useAlertStore = create<IAlertState & IAlertActions>()((set) => ({
  alert: null,
  show: (messageKey, variant = 'danger') => {
    if (clearTimer) clearTimeout(clearTimer);
    set({ alert: { messageKey, variant } });
    clearTimer = setTimeout(() => set({ alert: null }), AUTO_CLEAR_MS);
  },
  clear: () => {
    if (clearTimer) clearTimeout(clearTimer);
    clearTimer = null;
    set({ alert: null });
  },
}));
