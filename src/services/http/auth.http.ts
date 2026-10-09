import { unregisterPush } from '@/services/push';
import { apiClient, unwrap } from '@/services/api-client';
import type { AuthResponse, AuthService, LoginPayload } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { AppApiError, Driver } from '@/types';
import { ApiAuthUser, ApiDriverProfile, ApiLoginResponse, toDriver } from './mappers';

async function fetchDriverProfile(): Promise<ApiDriverProfile | null> {
  try {
    return await unwrap<ApiDriverProfile>(apiClient.get('/drivers/me'));
  } catch {
    return null; // fiche indisponible : on garde les informations du jeton
  }
}

/** Connexion du livreur sur l'API RUNEX (email, téléphone, code livreur ou matricule). */
class HttpAuthService implements AuthService {
  async login(credentials: LoginPayload): Promise<AuthResponse> {
    const identifier = (credentials.identifier || '').trim();
    const password = credentials.password || '';
    if (!identifier) {
      throw new AppApiError(
        400,
        'Veuillez renseigner votre numéro de téléphone ou matricule.',
        'EMPTY_IDENTIFIER'
      );
    }
    if (!password.trim()) {
      throw new AppApiError(400, 'Veuillez renseigner votre mot de passe.', 'EMPTY_PASSWORD');
    }

    const res = await unwrap<ApiLoginResponse>(
      apiClient.post('/auth/login', { identifier, password })
    );
    if (res.user.role !== 'LIVREUR' || !res.user.driverId) {
      // Le jeton ouvert n'est pas gardé : l'application est réservée aux livreurs.
      void apiClient
        .post(
          '/auth/logout',
          { refreshToken: res.refreshToken },
          { headers: { Authorization: `Bearer ${res.accessToken}` } }
        )
        .catch(() => undefined);
      throw new AppApiError(
        403,
        'Cette application est réservée aux livreurs RUNEX.',
        'NOT_A_DRIVER'
      );
    }

    // Jeton d'abord : la fiche livreur se lit avec lui.
    useAuthStore.getState().setTokens(res.accessToken, res.refreshToken);
    const profile = await fetchDriverProfile();
    const driver = toDriver(res.user, profile, useAuthStore.getState().driver);
    useAuthStore.getState().setAuth(res.accessToken, res.refreshToken, driver);
    return { token: res.accessToken, refreshToken: res.refreshToken, driver };
  }

  async logout(): Promise<void> {
    const { refreshToken } = useAuthStore.getState();
    // Avant la fermeture de session : la désinscription est authentifiée.
    await unregisterPush();
    try {
      await apiClient.post('/auth/logout', refreshToken ? { refreshToken } : {});
    } catch {
      /* déconnexion locale quoi qu'il arrive */
    }
    useAuthStore.getState().logout();
  }

  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    const res = await unwrap<{ accessToken: string; refreshToken?: string }>(
      apiClient.post('/auth/refresh', { refreshToken })
    );
    useAuthStore.getState().setTokens(res.accessToken, res.refreshToken ?? refreshToken);
    return { token: res.accessToken };
  }

  async getMe(): Promise<Driver> {
    const [user, profile] = await Promise.all([
      unwrap<ApiAuthUser>(apiClient.get('/auth/me')),
      fetchDriverProfile(),
    ]);
    const driver = toDriver(user, profile, useAuthStore.getState().driver);
    useAuthStore.getState().setDriver(driver);
    return driver;
  }
}

export const httpAuthService = new HttpAuthService();
