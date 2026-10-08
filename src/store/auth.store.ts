import { create } from 'zustand';
import { Driver } from '@/types';
import { clearSession, loadSession, saveSession } from '@/services/token-storage';

interface AuthState {
  driver: Driver | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Vrai une fois la session relue depuis le trousseau (au démarrage). */
  hydrated: boolean;

  // Actions
  setDriver: (driver: Driver | null) => void;
  setAuth: (token: string, refreshToken: string, driver: Driver) => void;
  setToken: (token: string | null) => void;
  setTokens: (token: string, refreshToken: string) => void;
  logout: () => void;
  getToken: () => string | null;
  hydrate: () => Promise<void>;
}

function persist(state: Pick<AuthState, 'token' | 'refreshToken' | 'driver'>) {
  if (state.token && state.refreshToken && state.driver) {
    void saveSession({
      token: state.token,
      refreshToken: state.refreshToken,
      driver: state.driver,
    });
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  driver: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  hydrated: false,

  setDriver: (driver: Driver | null) => {
    set({
      driver,
      isAuthenticated: !!driver && !!get().token,
    });
    persist(get());
  },

  setAuth: (token: string, refreshToken: string, driver: Driver) => {
    set({
      token,
      refreshToken,
      driver,
      isAuthenticated: true,
    });
    persist(get());
  },

  setToken: (token: string | null) => {
    set({
      token,
      isAuthenticated: !!token && !!get().driver,
    });
    persist(get());
  },

  setTokens: (token: string, refreshToken: string) => {
    set({ token, refreshToken, isAuthenticated: !!get().driver });
    persist(get());
  },

  logout: () => {
    set({
      driver: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    void clearSession();
  },

  getToken: () => get().token,

  hydrate: async () => {
    if (get().hydrated) return;
    const session = await loadSession();
    if (session && !get().token) {
      set({
        token: session.token,
        refreshToken: session.refreshToken,
        driver: session.driver as Driver,
        isAuthenticated: true,
      });
    }
    set({ hydrated: true });
  },
}));
