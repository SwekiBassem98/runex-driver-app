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

/* ------------------------------------------------------------------ */
/* Sous-zones : choisies par le livreur pour ranger sa tournée         */
/* ------------------------------------------------------------------ */

/** Sous-zone d'un colis, nettoyée (null : aucune). */
export function sousZone(p: Pick<Parcel, 'subZone'>): string | null {
  const v = String(p.subZone ?? '').replace(/\s+/g, ' ').trim();
  return v || null;
}

/** Sous-zones présentes dans la tournée, avec leur nombre de colis (ordre alphabétique). */
export function sousZonesDe(parcels: Pick<Parcel, 'subZone'>[]): { nom: string; count: number }[] {
  const compte = new Map<string, { nom: string; count: number }>();
  for (const p of parcels) {
    const nom = sousZone(p);
    if (!nom) continue;
    const k = norm(nom);
    const e = compte.get(k) ?? { nom, count: 0 };
    e.count++;
    compte.set(k, e);
  }
  return [...compte.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

/** Le colis est-il dans cette sous-zone (sans accents ni casse) ? */
export function colisDansSousZone(p: Pick<Parcel, 'subZone'>, nom: string): boolean {
  const s = sousZone(p);
  return !!s && norm(s) === norm(nom);
}

/**
 * Ordre de la liste : les colis rangés dans une sous-zone d'abord (groupés par
 * sous-zone, dans l'ordre alphabétique), puis les autres dans leur ordre.
 */
export function trierParSousZone<T extends Pick<Parcel, 'subZone'>>(parcels: T[]): T[] {
  return parcels
    .map((p, i) => ({ p, i, s: sousZone(p) }))
    .sort((a, b) => {
      if (a.s && !b.s) return -1;
      if (!a.s && b.s) return 1;
      if (a.s && b.s) {
        const c = a.s.localeCompare(b.s, 'fr', { sensitivity: 'base' });
        if (c !== 0) return c;
      }
      return a.i - b.i;
    })
    .map((x) => x.p);
}
