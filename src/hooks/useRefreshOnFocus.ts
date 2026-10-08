import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Relance un chargement quand l'écran redevient visible (retour depuis la
 * fiche d'un colis après « Livré », par exemple) — pas au premier affichage,
 * que l'écran charge déjà lui-même.
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
}
