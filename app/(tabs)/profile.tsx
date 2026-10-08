import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTabNavigation } from '@/hooks/useTabNavigation';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { BottomNav } from '@/components';
import { driversService } from '@/services/drivers.service';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { USE_MOCKS } from '@/config/env';
import { Driver, Zone } from '@/types';

/**
 * RUNEX Driver Profile Screen
 * Route: /app/(tabs)/profile.tsx
 *
 * Implements:
 * - Dark header: driver full name (bold, large) + "Matricule: XXXX TUN XXX"
 * - "Informations" card: Nom complet, Téléphone, CIN, Agence separated by thin dividers
 * - "Mes Zones" card: assigned zones chips + "Gérer mes Zones" row navigating to /profile/zones
 * - "Déconnexion" destructive button calling authService.logout() & redirecting to login
 * - Persistent BottomNav with "profil" active
 */
export default function ProfileScreen() {
  const router = useRouter();
  const goToTab = useTabNavigation('profil');
  const insets = useSafeAreaInsets();

  const storedDriver = useAuthStore((state) => state.driver);
  const [driver, setDriver] = useState<Driver | null>(storedDriver);
  const [loading, setLoading] = useState(!storedDriver);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const current = await driversService.getCurrentDriver();
      setDriver(current);
      useAuthStore.getState().setDriver(current);
    } catch {
      // Fallback to auth store if offline
      if (storedDriver) setDriver(storedDriver);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storedDriver]);

  useEffect(() => {
    let isMounted = true;
    driversService
      .getCurrentDriver()
      .then((current) => {
        if (!isMounted) return;
        setDriver(current);
        useAuthStore.getState().setDriver(current);
      })
      .catch(() => {
        const cached = useAuthStore.getState().driver;
        if (isMounted && cached) setDriver(cached);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      isMounted = false;
    };
    // Une seule lecture à l'ouverture : la fiche relue met à jour le store,
    // qui ne doit pas relancer la lecture (boucle de requêtes).
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const doLogout = async () => {
    setLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      useAuthStore.getState().logout();
    } finally {
      setLoggingOut(false);
      // La garde de navigation ramène déjà à la connexion ; ceci la rend explicite.
      router.replace('/login');
    }
  };

  const handleLogout = () => {
    const message = 'Êtes-vous sûr de vouloir vous déconnecter de votre session RUNEX Driver ?';
    // Alert à boutons n'existe pas sur le web (aperçu) : confirmation du navigateur.
    if (Platform.OS === 'web') {
      if (window.confirm(message)) void doLogout();
      return;
    }
    Alert.alert('Déconnexion', message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => void doLogout() },
    ]);
  };

  // Extract initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return 'RX';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const driverName = driver?.fullName || storedDriver?.fullName || '—';
  const driverMatricule = driver?.matricule || storedDriver?.matricule || '—';
  const driverPhone = driver?.phone || storedDriver?.phone || '—';
  const driverCin = driver?.cin || storedDriver?.cin || '—';
  const driverAgency = driver?.agency || storedDriver?.agency || '—';
  const assignedZones: Zone[] = driver?.zones || storedDriver?.zones || [];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ============================================================== */}
      {/* 1. DARK HEADER: Driver Name & Matricule                        */}
      {/* ============================================================== */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + spacing.xs, 16) }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{getInitials(driverName)}</Text>
          </View>

          <View style={styles.headerTitleGroup}>
            <Text style={styles.driverName} numberOfLines={1}>
              {driverName}
            </Text>
            <Text style={styles.driverMatricule}>Matricule: {driverMatricule}</Text>
          </View>

          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>En service</Text>
          </View>
        </View>
      </View>

      {/* ============================================================== */}
      {/* 2. BODY CONTENT                                                */}
      {/* ============================================================== */}
      <ScrollView
        style={styles.bodyScrollView}
        contentContainerStyle={[
          styles.bodyContent,
          { paddingBottom: Math.max(insets.bottom + spacing.xxxl * 2, 96) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Chargement du profil...</Text>
          </View>
        ) : (
          <>
            {/* ========================================================= */}
            {/* INFORMATIONS CARD                                         */}
            {/* ========================================================= */}
            <View style={styles.sectionWrapper}>
              <Text style={styles.sectionTitle}>Informations</Text>

              <View style={styles.card}>
                {/* Row 1: Nom complet */}
                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrapper}>
                    <Ionicons name="person-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.infoTextGroup}>
                    <Text style={styles.infoLabel}>Nom complet</Text>
                    <Text style={styles.infoValue}>{driverName}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Row 2: Téléphone */}
                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrapper}>
                    <Ionicons name="call-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.infoTextGroup}>
                    <Text style={styles.infoLabel}>Téléphone</Text>
                    <Text style={styles.infoValue}>{driverPhone}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Row 3: CIN */}
                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrapper}>
                    <Ionicons name="card-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.infoTextGroup}>
                    <Text style={styles.infoLabel}>CIN</Text>
                    <Text style={styles.infoValue}>{driverCin}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Row 4: Agence */}
                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrapper}>
                    <Ionicons name="business-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.infoTextGroup}>
                    <Text style={styles.infoLabel}>Agence</Text>
                    <Text style={styles.infoValue}>{driverAgency}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ========================================================= */}
            {/* MES ZONES SECTION                                         */}
            {/* ========================================================= */}
            <View style={styles.sectionWrapper}>
              <Text style={styles.sectionTitle}>Mes Zones</Text>

              <View style={styles.card}>
                {/* Navigation row: "Gérer mes Zones" */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => router.push('/profile/zones')}
                  style={styles.manageZonesRow}
                >
                  <View style={styles.manageZonesLeft}>
                    <View style={styles.manageZonesIconCircle}>
                      <Ionicons name="map-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.manageZonesTextGroup}>
                      <Text style={styles.manageZonesTitle}>Gérer mes Zones</Text>
                      <Text style={styles.manageZonesSubtitle}>Créer, modifier et organiser</Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* Assigned Zones list */}
                <View style={styles.assignedZonesContainer}>
                  <Text style={styles.assignedZonesHeader}>
                    Zones actuellement assignées ({assignedZones.length}) :
                  </Text>
                  <View style={styles.zonesChipsWrapper}>
                    {assignedZones.length > 0 ? (
                      assignedZones.map((zone) => (
                        <View key={zone.id} style={styles.zoneChip}>
                          <Ionicons name="location" size={13} color={colors.primary} />
                          <Text style={styles.zoneChipText}>{zone.name}</Text>
                          {zone.code && <Text style={styles.zoneChipCode}>({zone.code})</Text>}
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noZonesText}>Aucune zone assignée.</Text>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* ========================================================= */}
            {/* DESIGN SYSTEM & GALLERY SHORTCUT (DEV ACCESSIBILITY)      */}
            {/* ========================================================= */}
            {(USE_MOCKS || __DEV__) && (
              <View style={styles.sectionWrapper}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/_dev/components')}
                  style={styles.devGalleryButton}
                >
                  <View style={styles.devGalleryLeft}>
                    <Ionicons
                      name="color-palette-outline"
                      size={18}
                      color={colors.text.secondary}
                    />
                    <Text style={styles.devGalleryText}>Galerie de composants & Tests 403</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
            )}

            {/* ========================================================= */}
            {/* 3. DÉCONNEXION DESTRUCTIVE BUTTON                         */}
            {/* ========================================================= */}
            <View style={styles.logoutWrapper}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleLogout}
                disabled={loggingOut}
                style={styles.logoutButton}
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color={colors.status.danger} />
                ) : (
                  <>
                    <Ionicons name="log-out-outline" size={20} color={colors.status.danger} />
                    <Text style={styles.logoutButtonText}>Déconnexion</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.appVersionText}>RUNEX Driver • v1.0.0 (Tunisie)</Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* 4. PERSISTENT BOTTOM NAVIGATION (Profil Active)                */}
      {/* ============================================================== */}
      <BottomNav activeTab="profil" onTabPress={goToTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.header,
  },

  // Dark Header
  headerContainer: {
    backgroundColor: colors.background.header,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    ...shadows.header,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  avatarInitials: {
    color: colors.text.inverse,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerTitleGroup: {
    flex: 1,
  },
  driverName: {
    ...typography.h2,
    fontSize: 20,
    color: colors.text.inverse,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  driverMatricule: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 3,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radii.pill,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.3)',
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: radii.full,
    backgroundColor: colors.status.success,
  },
  onlineText: {
    color: colors.cash.green,
    fontSize: 11,
    fontWeight: '700',
  },

  // Body
  bodyScrollView: {
    flex: 1,
    backgroundColor: colors.background.body,
  },
  bodyContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  loadingWrapper: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },

  // Sections
  sectionWrapper: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },

  // Info Rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  infoIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: 'rgba(227, 30, 43, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextGroup: {
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  infoValue: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 15,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },

  // Mes Zones
  manageZonesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  manageZonesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  manageZonesIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(227, 30, 43, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageZonesTextGroup: {
    flex: 1,
  },
  manageZonesTitle: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '800',
    fontSize: 15,
  },
  manageZonesSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 1,
  },
  assignedZonesContainer: {
    paddingVertical: spacing.md,
  },
  assignedZonesHeader: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  zonesChipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radii.pill,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  zoneChipText: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  zoneChipCode: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 10,
  },
  noZonesText: {
    ...typography.caption,
    color: colors.text.muted,
    fontStyle: 'italic',
  },

  // Dev Shortcut
  devGalleryButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  devGalleryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  devGalleryText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },

  // Logout Button
  logoutWrapper: {
    marginTop: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: colors.status.danger,
    backgroundColor: 'rgba(220, 38, 38, 0.04)',
    gap: spacing.sm,
  },
  logoutButtonText: {
    ...typography.body,
    color: colors.status.danger,
    fontWeight: '800',
    fontSize: 15,
  },
  appVersionText: {
    ...typography.caption,
    color: colors.text.muted,
    fontSize: 11,
    marginTop: 4,
  },
});
