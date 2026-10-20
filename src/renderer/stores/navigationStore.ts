import { create } from 'zustand';

export type AppRoute = 'main' | 'library' | 'analytics' | 'settings' | 'about';

interface NavigationState {
  currentRoute: AppRoute;
  setRoute: (route: AppRoute) => void;
  closeModal: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentRoute: 'main',
  setRoute: (route) => set({ currentRoute: route }),
  closeModal: () => set({ currentRoute: 'main' })
}));
