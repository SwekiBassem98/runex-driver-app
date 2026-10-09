import { create } from 'zustand';

/**
 * Signal « les données ont changé côté serveur » : notification reçue,
 * notification touchée, retour de l'application au premier plan. Les écrans
 * qui chargent des données (accueil, tournée, ramassages) se rechargent à
 * chaque incrément, sans que le livreur ait à tirer pour rafraîchir.
 */
interface LiveState {
  version: number;
  bump: () => void;
}

export const useLiveStore = create<LiveState>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));
