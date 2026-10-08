import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

/**
 * Retour sonore et vibration des actions du livreur.
 *
 * Mêmes sons que la plateforme web (générés pour RUNEX) :
 *  scan      code lu                       success   action enregistrée
 *  complete  opération terminée            error     refus / code erroné
 *  warning   à vérifier                    notify    information
 *  remove    élément retiré
 *
 * Le son est joué même téléphone en mode silencieux (iOS) — le livreur scanne
 * en marchant, l'écran hors de vue — et se mélange à la musique ou au GPS en
 * cours sans les interrompre. La vibration accompagne chaque son ; les deux
 * se règlent dans Profil.
 */

export type SoundKind = 'scan' | 'success' | 'complete' | 'error' | 'warning' | 'notify' | 'remove';

const SOURCES: Record<SoundKind, number> = {
  scan: require('../../assets/sounds/scan.wav'),
  success: require('../../assets/sounds/success.wav'),
  complete: require('../../assets/sounds/complete.wav'),
  error: require('../../assets/sounds/error.wav'),
  warning: require('../../assets/sounds/warning.wav'),
  notify: require('../../assets/sounds/notify.wav'),
  remove: require('../../assets/sounds/remove.wav'),
};

/** Une erreur prime sur un succès joué au même instant. */
const PRIORITY: Record<SoundKind, number> = {
  error: 6,
  warning: 5,
  complete: 4,
  success: 3,
  remove: 2,
  scan: 1,
  notify: 0,
};
const DEDUP_MS = 250;

interface FeedbackState {
  sound: boolean;
  vibration: boolean;
  /** 0 → 1 */
  volume: number;
  loaded: boolean;
  setSound: (v: boolean) => void;
  setVibration: (v: boolean) => void;
  setVolume: (v: number) => void;
  load: () => Promise<void>;
}

const KEY = 'runex.feedback.v1';

async function readPrefs(): Promise<Partial<FeedbackState> | null> {
  try {
    const raw =
      Platform.OS === 'web'
        ? globalThis.localStorage?.getItem(KEY)
        : await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as Partial<FeedbackState>) : null;
  } catch {
    return null;
  }
}

function savePrefs(s: Pick<FeedbackState, 'sound' | 'vibration' | 'volume'>) {
  const raw = JSON.stringify({ sound: s.sound, vibration: s.vibration, volume: s.volume });
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, raw);
    else void SecureStore.setItemAsync(KEY, raw).catch(() => undefined);
  } catch {
    /* réglage gardé pour la session */
  }
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  sound: true,
  vibration: true,
  volume: 1,
  loaded: false,
  setSound: (sound) => {
    set({ sound });
    savePrefs(get());
  },
  setVibration: (vibration) => {
    set({ vibration });
    savePrefs(get());
  },
  setVolume: (volume) => {
    set({ volume: Math.min(1, Math.max(0, volume)) });
    savePrefs(get());
  },
  load: async () => {
    if (get().loaded) return;
    const p = await readPrefs();
    set({
      sound: p?.sound !== false,
      vibration: p?.vibration !== false,
      volume: typeof p?.volume === 'number' ? p.volume : 1,
      loaded: true,
    });
  },
}));

const players = new Map<SoundKind, AudioPlayer>();
let audioReady: Promise<void> | null = null;
let last: { kind: SoundKind; at: number } | null = null;

/** Mode audio + préchargement des sept sons (appelé au démarrage). */
export function prepareFeedback(): Promise<void> {
  if (audioReady) return audioReady;
  audioReady = (async () => {
    void useFeedbackStore.getState().load();
    try {
      await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
    } catch {
      /* mode par défaut */
    }
    for (const kind of Object.keys(SOURCES) as SoundKind[]) {
      try {
        players.set(kind, createAudioPlayer(SOURCES[kind]));
      } catch {
        /* son indisponible : la vibration reste */
      }
    }
  })();
  return audioReady;
}

function vibrate(kind: SoundKind) {
  if (Platform.OS === 'web') return;
  const run = (p: Promise<void>) => void p.catch(() => undefined);
  switch (kind) {
    case 'error':
      run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
      break;
    case 'warning':
      run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
      break;
    case 'success':
    case 'complete':
      run(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      break;
    case 'scan':
    case 'remove':
      run(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
      break;
    default:
      break;
  }
}

/** Joue le retour d'une action. Ne lève jamais d'erreur. */
export function playFeedback(kind: SoundKind): void {
  const now = Date.now();
  if (last && now - last.at < DEDUP_MS && PRIORITY[kind] <= PRIORITY[last.kind]) return;
  last = { kind, at: now };

  const { sound, vibration, volume } = useFeedbackStore.getState();
  if (vibration) vibrate(kind);
  if (!sound || volume <= 0) return;

  // Trace pour le test de bout en bout (build web).
  (globalThis as { __runexSounds?: SoundKind[] }).__runexSounds?.push(kind);

  void prepareFeedback().then(() => {
    const player = players.get(kind);
    if (!player) return;
    try {
      player.volume = volume;
      void player.seekTo(0).catch(() => undefined);
      player.play();
    } catch {
      /* rien */
    }
  });
}

export const feedback = {
  scan: () => playFeedback('scan'),
  success: () => playFeedback('success'),
  complete: () => playFeedback('complete'),
  error: () => playFeedback('error'),
  warning: () => playFeedback('warning'),
  notify: () => playFeedback('notify'),
  remove: () => playFeedback('remove'),
};
