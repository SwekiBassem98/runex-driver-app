import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import type { BottomNavTab } from '@/components/BottomNav';

const ROUTES: Record<
  BottomNavTab,
  '/home' | '/runsheet' | '/scanner' | '/pickup' | '/retour' | '/profile'
> = {
  accueil: '/home',
  runsheet: '/runsheet',
  scanner: '/scanner',
  pickup: '/pickup',
  retour: '/retour',
  profil: '/profile',
};

/**
 * Navigation de la barre du bas, comme des onglets : la pile reste
 * [Accueil, onglet courant]. Le bouton retour d'Android ramène à l'accueil,
 * puis quitte l'application — au lieu de rejouer chaque onglet visité, et
 * sans garder en mémoire un écran (et une caméra) par onglet ouvert.
 */
export function useTabNavigation(current: BottomNavTab) {
  const router = useRouter();
  return useCallback(
    (tab: BottomNavTab) => {
      if (tab === current) return;
      if (tab === 'accueil') {
        router.dismissTo('/home');
      } else if (current === 'accueil') {
        router.push(ROUTES[tab]);
      } else {
        router.replace(ROUTES[tab]);
      }
    },
    [current, router]
  );
}
