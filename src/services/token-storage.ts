import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Stockage de la session : trousseau chiffré du téléphone (Keychain /
 * Keystore). Sur le web (aperçu), le stockage local du navigateur.
 */
const KEY = 'runex.session.v1';

export interface StoredSession {
  token: string;
  refreshToken: string;
  driver: unknown;
}

const web = {
  get: (): string | null => {
    try {
      return globalThis.localStorage?.getItem(KEY) ?? null;
    } catch {
      return null;
    }
  },
  set: (v: string) => {
    try {
      globalThis.localStorage?.setItem(KEY, v);
    } catch {
      /* stockage indisponible : la session reste en mémoire */
    }
  },
  del: () => {
    try {
      globalThis.localStorage?.removeItem(KEY);
    } catch {
      /* rien */
    }
  },
};

export async function loadSession(): Promise<StoredSession | null> {
  try {
    const raw = Platform.OS === 'web' ? web.get() : await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    return parsed?.token && parsed?.refreshToken ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveSession(session: StoredSession): Promise<void> {
  const raw = JSON.stringify(session);
  try {
    if (Platform.OS === 'web') web.set(raw);
    else await SecureStore.setItemAsync(KEY, raw);
  } catch {
    /* la session reste en mémoire pour cette exécution */
  }
}

export async function clearSession(): Promise<void> {
  try {
    if (Platform.OS === 'web') web.del();
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* rien */
  }
}
