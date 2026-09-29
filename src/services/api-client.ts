import { create, AxiosError, AxiosResponse, InternalAxiosRequestConfig, isAxiosError } from 'axios';
import { ApiError, AppApiError } from '@/types';
import { useAuthStore } from '@/store/auth.store';

/**
 * Base API URL for LogiXpress Tunisie / RUNEX API (Express 4)
 * Defaults to http://localhost:4000/api/v1 to match local backend port
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

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
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<{ message?: string; code?: string; error?: string }>) => {
    return Promise.reject(normalizeError(error));
  }
);

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
      message = 'Impossible de contacter le serveur RUNEX. Vérifiez votre connexion internet.';
    } else if (status === 403) {
      message =
        message ||
        "Action non autorisée: vous n'avez pas les permissions requises pour cette opération.";
    } else if (status === 401) {
      message = 'Session expirée ou invalide. Veuillez vous reconnecter.';
    }

    return new AppApiError(status, message, code, data);
  }

  if (error instanceof Error) {
    return new AppApiError(500, error.message, 'INTERNAL_ERROR');
  }

  return new AppApiError(500, 'Une erreur inconnue est survenue.', 'UNKNOWN_ERROR', error);
}
