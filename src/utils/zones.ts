import type { Driver, Parcel, Zone } from '@/types';

/**
 * Zones du livreur : elles valent pour une journée (heure de Tunis). Chaque
 * matin le livreur choisit à nouveau ses zones ; la plateforme efface celles
 * de la veille et le téléphone ne réaffiche jamais des zones d'un autre jour.
 */
export function jourTunis(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Tunis',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Zones du livreur si elles ont été lues aujourd'hui, sinon aucune. */
export function zonesDuJour(driver: Driver | null | undefined): Zone[] {
  if (!driver?.zones?.length) return [];
  return driver.zonesDay === jourTunis() ? driver.zones : [];
}

const norm = (v: string | null | undefined) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Clé d'une zone (gouvernorat, délégation), sans accents ni casse. */
export function cleZone(governorate?: string | null, delegation?: string | null): string {
  return `${norm(governorate)}|${norm(delegation)}`;
}

/**
 * Le colis est-il dans la zone ? Par identifiant de zone de la plateforme,
 * sinon par le couple (gouvernorat, délégation) de son adresse.
 */
export function colisDansZone(p: Pick<Parcel, 'zoneId' | 'governorate' | 'delegation'>, z: Zone): boolean {
  if (p.zoneId && p.zoneId === z.id) return true;
  if (!z.governorate || !z.delegation) return false;
  return cleZone(p.governorate, p.delegation) === cleZone(z.governorate, z.delegation);
}
