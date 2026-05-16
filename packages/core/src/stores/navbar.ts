import { create } from 'zustand';

interface INavbarState {
  isVisible: boolean;
}

interface INavbarActions {
  setNavbarVisible: (visible: boolean) => void;
}

export const useNavbarStore = create<INavbarState & INavbarActions>()((set) => ({
  isVisible: true,
  setNavbarVisible: (isVisible) => set({ isVisible }),
}));
