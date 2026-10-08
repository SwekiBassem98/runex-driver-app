import axios, {
  create,
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
  isAxiosError,
} from 'axios';
import { ApiError, AppApiError } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { API_BASE_URL } from '@/config/env';

export { API_BASE_URL };

/**
 * Axios instance configured for RUNEX Driver API
 */
export const apiClient = create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Request Interceptor:
 * Injects JWT Bearer token from auth store into Authorization header
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(normalizeError(error))
);

/**
 * Response Interceptor:
 * Normalizes all HTTP errors into an ApiError (AppApiError) shape
 */
/**
 * Renouvellement du jeton d'accès (15 min) avec le jeton de rafraîchissement.
 * Un seul renouvellement à la fois : les requêtes parties en même temps
 * attendent le même résultat au lieu d'en lancer chacune un.
 */
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const res = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      {
        timeout: 15000,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      }
    );
    const data = res.data?.data as { accessToken?: string; refreshToken?: string } | undefined;
    if (!data?.accessToken) return null;
    useAuthStore.getState().setTokens(data.accessToken, data.refreshToken ?? refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<{ message?: string; code?: string; error?: string }>) => {
    const original = error.config as
      (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall =
      original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      refreshing = refreshing ?? refreshAccessToken().finally(() => (refreshing = null));
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      }
      // Session expirée pour de bon : retour à l'écran de connexion.
      useAuthStore.getState().logout();
    }
    return Promise.reject(normalizeError(error));
  }
);

/** Enveloppe `{ success, data, message }` de l'API RUNEX. */
export async function unwrap<T>(request: Promise<AxiosResponse<{ data?: T }>>): Promise<T> {
  const res = await request;
  return res.data?.data as T;
}

/**
 * Normalizes any error (AxiosError, AppApiError, standard Error, or unknown)
 * into a standardized ApiError shape.
 */
export function normalizeError(error: unknown): ApiError {
  if (error instanceof AppApiError) {
    return error;
  }

  if (isAxiosError(error)) {
    const status = error.response?.status || 0;
    const data = error.response?.data;

    const code =
      data?.code ||
      (status === 403
        ? 'FORBIDDEN'
        : status === 401
          ? 'UNAUTHORIZED'
          : status === 404
            ? 'NOT_FOUND'
            : status === 0
              ? 'NETWORK_ERROR'
              : 'API_ERROR');

    let message = data?.message || data?.error || error.message;

    if (status === 0 || error.code === 'ERR_NETWORK') {
      message = __DEV__
        ? `Serveur RUNEX injoignable (${API_BASE_URL}). Le téléphone et l'ordinateur doivent être sur le même Wi-Fi, et l'API démarrée.`
        : 'Impossible de contacter le serveur RUNEX. Vérifiez votre connexion internet.';
    } else if (status === 403) {
      message =
        message ||
        "Action non autorisée: vous n'avez pas les permissions requises pour cette opération.";
    } else if (status === 401 && !error.config?.url?.includes('/auth/login')) {
      message = 'Session expirée ou invalide. Veuillez vous reconnecter.';
    }

    return new AppApiError(status, message, code, data);
  }

  if (error instanceof Error) {
    return new AppApiError(500, error.message, 'INTERNAL_ERROR');
  }

  return new AppApiError(500, 'Une erreur inconnue est survenue.', 'UNKNOWN_ERROR', error);
}
