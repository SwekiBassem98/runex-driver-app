import { USE_MOCKS } from '@/config/env';
import { AppApiError, Parcel, ScanAction, ScanResult } from '@/types';
import { apiClient, unwrap } from './api-client';
import { ApiPackage, toParcel } from './http/mappers';
import { mockRunsheetsService } from './runsheets.service';
import { useAuthStore } from '@/store/auth.store';

/**
 * Scan d'un code lu sur le bon de livraison (QR ou code-barres).
 *
 * L'application n'interprète pas le code : elle l'envoie tel quel à
 * `POST /scan`, qui reconnaît code-barres, numéro de suivi, étiquette de pièce
 * (`…-2`) et lien, et répond avec le colis, la pièce lue et les actions
 * possibles. Les refus portent un code stable (`err.code`) :
 * INVALID_CODE, UNKNOWN_CODE, PIECE_NOT_FOUND, NOT_ASSIGNED, OUT_OF_SCOPE.
 */
export interface ScanService {
  scan(code: string): Promise<ScanResult>;
  /** Exécute une action proposée par le scan (méthode, chemin et corps fournis). */
  runAction(action: ScanAction): Promise<unknown>;
}

interface ApiScanResult extends Omit<ScanResult, 'parcel'> {
  package: ApiPackage;
}

class HttpScanService implements ScanService {
  async scan(code: string): Promise<ScanResult> {
    const { package: pkg, ...rest } = await unwrap<ApiScanResult>(
      apiClient.post('/scan', { code })
    );
    return { ...rest, parcel: toParcel(pkg) };
  }

  async runAction(action: ScanAction): Promise<unknown> {
    const res = await apiClient.request({
      method: action.method,
      url: action.path,
      data: action.body ?? {},
    });
    return res.data?.data;
  }
}

/** Démonstration : même contrat, sur la tournée fictive. */
class MockScanService implements ScanService {
  async scan(raw: string): Promise<ScanResult> {
    const clean = raw.trim().toUpperCase();
    const m = /^(.+)-(\d{1,3})$/.exec(clean);
    const base = m && !/^RNX-TN-\d+$/.test(clean) ? m[1]! : clean;
    const piece = m && base !== clean ? Number(m[2]) : null;
    if (!/^[A-Z0-9-]{3,}$/.test(base)) {
      throw new AppApiError(400, 'Étiquette illisible : rescannez le code.', 'INVALID_CODE');
    }
    const runsheet = await mockRunsheetsService.getActiveRunsheet();
    const norm = (v: string) => v.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const parcel: Parcel | undefined = runsheet.parcels.find(
      (p) => norm(p.code) === norm(base) || p.id.toUpperCase() === base
    );
    if (!parcel)
      throw new AppApiError(404, `Aucun colis ne correspond au code ${raw}.`, 'UNKNOWN_CODE');
    const me = useAuthStore.getState().driver?.id ?? 'drv-7701';
    if (parcel.driverId && parcel.driverId !== me && parcel.driverId !== 'drv-7701') {
      throw new AppApiError(403, 'Ce colis ne vous est pas affecté.', 'NOT_ASSIGNED');
    }
    const count = parcel.pieceCount ?? 1;
    if (piece !== null && piece > count) {
      throw new AppApiError(
        409,
        `Pièce ${piece} : ce colis n'a que ${count} pièce(s).`,
        'PIECE_NOT_FOUND'
      );
    }
    return {
      code: raw,
      kind: piece !== null ? 'piece' : 'barcode',
      piece: piece !== null ? { number: piece, count } : null,
      relation: 'DELIVERY',
      nextStatuses: [],
      actions: [],
      parcel,
    };
  }

  async runAction(): Promise<unknown> {
    return null;
  }
}

export const scanService: ScanService = USE_MOCKS ? new MockScanService() : new HttpScanService();

/** Message court et réflexe à afficher pour un scan refusé. */
export function scanErrorMessage(err: unknown, code: string): string {
  const e = err as { code?: string; message?: string; status?: number };
  switch (e?.code) {
    case 'INVALID_CODE':
      return 'Étiquette illisible : rescannez le code ou saisissez-le.';
    case 'UNKNOWN_CODE':
      return `Colis inconnu (${code}).`;
    case 'PIECE_NOT_FOUND':
      return 'Étiquette de pièce invalide : le bon doit être réimprimé.';
    case 'NOT_ASSIGNED':
      return 'Ce colis ne vous est pas affecté (ni tournée, ni ramassage).';
    case 'OUT_OF_SCOPE':
      return 'Ce colis n’est pas dans votre périmètre.';
    default:
      return e?.message || 'Scan impossible.';
  }
}
