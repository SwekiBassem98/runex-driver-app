import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Configuration d'exécution.
 *
 * EXPO_PUBLIC_API_URL   URL de l'API RUNEX, ex. https://api.runex.tn/api/v1
 * EXPO_PUBLIC_USE_MOCKS "true" pour travailler sur les données de démonstration
 *                       (développement uniquement). Par défaut : l'API réelle.
 * EXPO_PUBLIC_ALLOW_HTTP "true" pour accepter une API en http dans un build de
 *                       production (tests locaux seulement, jamais pour un APK livré).
 *
 * Sans EXPO_PUBLIC_API_URL, en développement, on vise l'API sur la machine qui
 * sert le bundle (même adresse IP que Metro, port 4000) : un téléphone sur le
 * même Wi-Fi n'atteint pas « localhost », qui désigne le téléphone lui-même.
 */
function devMachineApiUrl(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    // Expo Go / anciens manifestes
    (Constants as unknown as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } })
      .manifest2?.extra?.expoGo?.debuggerHost;
  const host = hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:4000/api/v1`;
  // Émulateur Android : la machine hôte est 10.0.2.2.
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000/api/v1';
  return 'http://localhost:4000/api/v1';
}

const RAW_API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();
const ALLOW_HTTP = process.env.EXPO_PUBLIC_ALLOW_HTTP === 'true';

export const API_BASE_URL = (RAW_API_URL || (__DEV__ ? devMachineApiUrl() : '')).replace(
  /\/+$/,
  ''
);

/**
 * Données de démonstration : réservées au développement. Un APK livré à un
 * livreur travaille toujours sur l'API réelle, même si la variable a été
 * laissée à `true` par erreur.
 */
export const USE_MOCKS = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === 'true';

/**
 * Configuration invalide d'un build de production (APK) : message affiché à
 * la place de l'application. Sans ce contrôle, un APK compilé sans
 * EXPO_PUBLIC_API_URL viserait une adresse de développement injoignable, et
 * une API en http enverrait mots de passe et jetons en clair sur le réseau
 * mobile.
 */
export const API_CONFIG_ERROR: string | null = (() => {
  if (__DEV__) return null;
  if (!RAW_API_URL) {
    return "Adresse du serveur RUNEX absente de cette version (EXPO_PUBLIC_API_URL). Contactez l'administrateur.";
  }
  if (/REMPLACER/i.test(RAW_API_URL)) {
    return "Cette version a été compilée avec l'adresse d'exemple du serveur (eas.json). Contactez l'administrateur.";
  }
  if (!/^https:\/\//i.test(RAW_API_URL) && !ALLOW_HTTP) {
    return "Cette version vise un serveur non sécurisé (http). Contactez l'administrateur pour obtenir la version à jour.";
  }
  return null;
})();
