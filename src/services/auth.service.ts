import { Driver, AppApiError } from '@/types';
import { mockDriverProfile } from './drivers.service';
import { useAuthStore } from '@/store/auth.store';
import { USE_MOCKS } from '@/config/env';
import { httpAuthService } from './http/auth.http';

export interface LoginPayload {
  identifier: string; // Phone number or matricule (e.g. 27949967 or 6383 TUN 181)
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
  /** Changement par le livreur connecté ; renvoie le nombre d'autres sessions fermées. */
  changePassword(currentPassword: string, newPassword: string): Promise<number>;
  /** Envoie un lien de réinitialisation à l'adresse email du compte. */
  requestPasswordReset(email: string): Promise<void>;
}

const delay = (ms?: number) =>
  new Promise((resolve) => setTimeout(resolve, ms ?? 400 + Math.random() * 200));

class MockAuthService implements AuthService {
  async login(credentials: LoginPayload): Promise<AuthResponse> {
    await delay();

    const cleanId = (credentials.identifier || '').trim();
    const cleanPass = (credentials.password || '').trim();

    if (!cleanId) {
      throw new AppApiError(
        400,
        'Veuillez renseigner votre numéro de téléphone ou matricule.',
        'EMPTY_IDENTIFIER'
      );
    }

    if (!cleanPass) {
      throw new AppApiError(400, 'Veuillez renseigner votre mot de passe.', 'EMPTY_PASSWORD');
    }

    // Mock failure path for specific test input "0000" (phone, matricule, or password)
    if (cleanId === '0000' || cleanPass === '0000') {
      throw new AppApiError(
        401,
        'Identifiants incorrects. Vérifiez votre matricule ou numéro de téléphone et réessayez.',
        'INVALID_CREDENTIALS'
      );
    }

    const token = `rnx_jwt_${Date.now()}_tunisia_livreur`;
    const refreshToken = `rnx_refresh_${Date.now()}`;

    // Customize mock driver with provided identifier if provided
    const isPhone = /^[0-9+ ]+$/.test(cleanId);
    const driver: Driver = {
      ...mockDriverProfile,
      phone: isPhone ? cleanId : mockDriverProfile.phone,
      matricule: !isPhone ? cleanId.toUpperCase() : mockDriverProfile.matricule,
    };

    // Update Zustand auth store
    useAuthStore.getState().setAuth(token, refreshToken, driver);

    return {
      token,
      refreshToken,
      driver,
    };
  }

  async logout(): Promise<void> {
    await delay(150);
    useAuthStore.getState().logout();
  }

  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    await delay(150);
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

  async changePassword(currentPassword: string, newPassword: string): Promise<number> {
    await delay();
    if (currentPassword === '0000') {
      throw new AppApiError(400, 'Le mot de passe actuel est incorrect.', 'INVALID_PASSWORD');
    }
    if (newPassword.length < 8) {
      throw new AppApiError(
        400,
        'Le mot de passe doit contenir au moins 8 caractères.',
        'WEAK_PASSWORD'
      );
    }
    return 0;
  }

  async requestPasswordReset(): Promise<void> {
    await delay();
  }
}

export const mockAuthService = new MockAuthService();
export const authService: AuthService = USE_MOCKS ? mockAuthService : httpAuthService;
