import { create } from 'zustand';

export type AppRoute = 'home' | 'main' | 'playlist' | 'library' | 'analytics' | 'settings' | 'about';

interface NavigationState {
  currentRoute: AppRoute;
  setRoute: (route: AppRoute) => void;
  closeModal: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentRoute: 'home',
  setRoute: (route) => set({ currentRoute: route === 'main' ? 'home' : route }),
  closeModal: () => set({ currentRoute: 'home' })
}));
