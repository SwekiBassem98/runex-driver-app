import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Configuration d'exécution.
 *
 * EXPO_PUBLIC_API_URL   URL de l'API RUNEX, ex. https://api.runex.tn/api/v1
 * EXPO_PUBLIC_USE_MOCKS "true" pour travailler sur les données de démonstration
 *                       (aucune API nécessaire). Par défaut : l'API réelle.
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

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || devMachineApiUrl()).replace(
  /\/+$/,
  ''
);

export const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === 'true';
