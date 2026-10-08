import type { DriversService } from '@/services/drivers.service';
import { tunisianZones } from '@/services/zones';
import { useAuthStore } from '@/store/auth.store';
import { Driver, Zone } from '@/types';
import { httpAuthService } from './auth.http';

/**
 * Profil du livreur. L'identité vient de l'API (`/auth/me`, `/drivers/me`).
 * Les zones et le statut de service ne sont pas encore gérés par la
 * plateforme : ils restent des préférences enregistrées sur le téléphone.
 */
class HttpDriversService implements DriversService {
  async getCurrentDriver(): Promise<Driver> {
    return httpAuthService.getMe();
  }

  private current(): Driver {
    const d = useAuthStore.getState().driver;
    if (!d) throw new Error('Session absente.');
    return d;
  }

  private save(driver: Driver): Driver {
    useAuthStore.getState().setDriver(driver);
    return { ...driver };
  }

  async getDriverZones(): Promise<Zone[]> {
    return [...(this.current().zones ?? [])];
  }

  async getAllZones(): Promise<Zone[]> {
    return [...tunisianZones];
  }

  async addDriverZone(zoneId: string): Promise<Driver> {
    const d = this.current();
    const zone = tunisianZones.find((z) => z.id === zoneId);
    if (!zone || d.zones.some((z) => z.id === zoneId)) return { ...d };
    return this.save({ ...d, zones: [...d.zones, zone] });
  }

  async removeDriverZone(zoneId: string): Promise<Driver> {
    const d = this.current();
    return this.save({ ...d, zones: d.zones.filter((z) => z.id !== zoneId) });
  }

  async updateDriverZones(zoneIds: string[]): Promise<Driver> {
    const d = this.current();
    return this.save({ ...d, zones: tunisianZones.filter((z) => zoneIds.includes(z.id)) });
  }

  async updateDriverStatus(status: 'active' | 'on_duty' | 'off_duty'): Promise<Driver> {
    return this.save({ ...this.current(), status });
  }
}

export const httpDriversService = new HttpDriversService();
