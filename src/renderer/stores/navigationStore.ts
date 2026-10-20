import { create } from 'zustand';

export type AppRoute = 'home' | 'player' | 'library' | 'analytics' | 'settings' | 'about';

interface NavigationState {
  currentRoute: AppRoute;
  setRoute: (route: AppRoute) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentRoute: 'home',
  setRoute: (route) => set({ currentRoute: route })
}));
