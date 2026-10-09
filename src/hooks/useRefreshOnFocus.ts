import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useLiveStore } from '@/store/live.store';

/**
 * Relance un chargement quand l'écran redevient visible (retour depuis la
 * fiche d'un colis après « Livré », par exemple) — pas au premier affichage,
 * que l'écran charge déjà lui-même — et quand le serveur signale un
 * changement (notification reçue, application rouverte).
 */
export function useRefreshOnFocus(refresh: () => unknown) {
  const first = useRef(true);
  const latest = useRef(refresh);
  useEffect(() => {
    latest.current = refresh;
  }, [refresh]);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      void latest.current();
    }, [])
  );

  const version = useLiveStore((s) => s.version);
  const seen = useRef(version);
  useEffect(() => {
    if (version === seen.current) return;
    seen.current = version;
    void latest.current();
  }, [version]);
}
