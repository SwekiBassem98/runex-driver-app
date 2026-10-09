import { AppState, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { apiClient } from '@/services/api-client';
import { USE_MOCKS } from '@/config/env';
import { useLiveStore } from '@/store/live.store';

/**
 * Notifications poussées du livreur (Firebase Cloud Messaging).
 *
 * L'API envoie une notification « système » : Android l'affiche et la fait
 * sonner lui-même, application fermée ou téléphone verrouillé — aucun code
 * de l'application ne tourne pour cela. L'application, elle :
 *  1. crée le canal « Alertes RUNEX » (importance maximale, son RUNEX) ;
 *  2. demande l'autorisation (Android 13+) ;
 *  3. envoie le jeton FCM du téléphone à l'API (`POST /devices/push-token`),
 *     à chaque connexion et à chaque renouvellement du jeton ;
 *  4. application ouverte : affiche la notification et rafraîchit l'écran ;
 *  5. au toucher d'une notification : ouvre l'écran concerné.
 *
 * Le nom du canal et du son doivent rester ceux de l'API
 * (apps/api/src/modules/notifications/push.service.ts).
 */

export const ANDROID_CHANNEL_ID = 'runex-alerts';
const SOUND_FILE = 'runex_alert.wav';
const TOKEN_KEY = 'runex.push.token.v1';

// Application au premier plan : la notification s'affiche et sonne aussi.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Les notifications poussées n'existent ni sur le web, ni dans Expo Go (SDK 53+). */
function pushSupported(): boolean {
  if (Platform.OS === 'web' || USE_MOCKS) return false;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  return Device.isDevice;
}

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Alertes RUNEX',
    description: 'Nouvelles tournées, colis ajoutés ou retirés, ramassages.',
    importance: Notifications.AndroidImportance.MAX,
    sound: SOUND_FILE,
    vibrationPattern: [0, 400, 200, 400],
    enableVibrate: true,
    lightColor: '#E31E2B',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
  });
}

export type PushStatus = 'enabled' | 'denied' | 'unsupported' | 'error';

async function sendToken(token: string): Promise<void> {
  await apiClient.post('/devices/push-token', {
    token,
    platform: Platform.OS,
    deviceId: Device.modelName ?? null,
  });
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    /* rien : seule la désinscription s'en sert */
  }
}

/**
 * Active les notifications pour le livreur connecté. Ne lève jamais : sans
 * notification, l'application reste utilisable (rafraîchissement à l'ouverture).
 */
export async function registerForPush(): Promise<PushStatus> {
  if (!pushSupported()) return 'unsupported';
  try {
    // Android 13+ : le canal doit exister avant la demande d'autorisation.
    await ensureAndroidChannel();
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return 'denied';
    const { data } = await Notifications.getDevicePushTokenAsync();
    if (typeof data !== 'string' || data.length < 20) return 'error';
    await sendToken(data);
    return 'enabled';
  } catch (error) {
    if (__DEV__) console.warn('[Push] Enregistrement impossible :', error);
    return 'error';
  }
}

/** À la déconnexion : ce téléphone ne doit plus recevoir les alertes de ce livreur. */
export async function unregisterPush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) await apiClient.delete('/devices/push-token', { data: { token } });
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* l'API réattribue de toute façon le jeton au prochain livreur connecté */
  }
}

/** Écran à ouvrir pour une notification touchée. */
export function routeFor(data: Record<string, unknown> | undefined): string {
  switch (String(data?.relatedEntity ?? '')) {
    case 'RAMASSAGE':
      return '/pickup';
    case 'RUNSHEET':
    case 'PACKAGE':
      return '/runsheet';
    default:
      return '/home';
  }
}

let handledResponseId: string | null = null;

function openFromResponse(response: Notifications.NotificationResponse | null | undefined) {
  if (!response) return;
  const id = response.notification.request.identifier;
  if (id === handledResponseId) return;
  handledResponseId = id;
  useLiveStore.getState().bump();
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  // Laisse la navigation se monter (démarrage à froid depuis la notification).
  setTimeout(() => router.push(routeFor(data) as never), 50);
}

/**
 * Écoutes globales, à démarrer une fois le livreur connecté. Renvoie la
 * fonction d'arrêt (déconnexion).
 */
export function startPushListeners(): () => void {
  const subs: { remove: () => void }[] = [];

  // Retour dans l'application : les données ont pu changer pendant l'absence.
  subs.push(
    AppState.addEventListener('change', (state) => {
      if (state === 'active') useLiveStore.getState().bump();
    })
  );
  if (Platform.OS === 'web') return () => subs.forEach((s) => s.remove());

  // Toute notification reçue, application ouverte : les écrans se rechargent.
  subs.push(Notifications.addNotificationReceivedListener(() => useLiveStore.getState().bump()));

  // Notification touchée (application en arrière-plan ou fermée).
  subs.push(Notifications.addNotificationResponseReceivedListener(openFromResponse));
  void Notifications.getLastNotificationResponseAsync()
    .then(openFromResponse)
    .catch(() => undefined);

  // Jeton renouvelé par Firebase : l'API doit connaître le nouveau.
  if (pushSupported()) {
    subs.push(
      Notifications.addPushTokenListener(({ data }) => {
        if (typeof data === 'string') void sendToken(data).catch(() => undefined);
      })
    );
  }

  return () => subs.forEach((s) => s.remove());
}
