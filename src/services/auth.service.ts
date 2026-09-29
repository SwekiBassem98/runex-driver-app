import { Driver, AppApiError } from '@/types';
import { mockDriverProfile } from './drivers.service';
import { useAuthStore } from '@/store/auth.store';

export interface LoginPayload {
  phone: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  driver: Driver;
}

export interface AuthService {
  login(credentials: LoginPayload): Promise<AuthResponse>;
  logout(): Promise<void>;
  refreshToken(refreshToken: string): Promise<{ token: string }>;
  getMe(): Promise<Driver>;
}

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? 350 + Math.random() * 250));

class MockAuthService implements AuthService {
  async login(credentials: LoginPayload): Promise<AuthResponse> {
    await delay();

    const cleanPhone = credentials.phone.replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      throw new AppApiError(
        400,
        'Numéro de téléphone tunisien invalide (ex: 27949967).',
        'INVALID_PHONE_NUMBER'
      );
    }

    if (!credentials.password || credentials.password.length < 4) {
      throw new AppApiError(
        400,
        'Le mot de passe doit comporter au moins 4 caractères.',
        'INVALID_PASSWORD'
      );
    }

    const token = `rnx_jwt_${Date.now()}_tunisia_livreur`;
    const refreshToken = `rnx_refresh_${Date.now()}`;
    const driver = { ...mockDriverProfile };

    // Update Zustand auth store
    useAuthStore.getState().setAuth(token, refreshToken, driver);

    return {
      token,
      refreshToken,
      driver,
    };
  }

  async logout(): Promise<void> {
    await delay(200);
    useAuthStore.getState().logout();
  }

  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    await delay(200);
    if (!refreshToken) {
      throw new AppApiError(401, 'Token de rafraîchissement absent.', 'INVALID_REFRESH_TOKEN');
    }
    const token = `rnx_jwt_${Date.now()}_refreshed`;
    useAuthStore.getState().setToken(token);
    return { token };
  }

  async getMe(): Promise<Driver> {
    await delay();
    const stored = useAuthStore.getState().driver;
    if (stored) return stored;
    return { ...mockDriverProfile };
  }
}

export const mockAuthService = new MockAuthService();
export const authService: AuthService = mockAuthService;
