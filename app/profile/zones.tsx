import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { driversService } from '@/services/drivers.service';
import { Zone, Driver } from '@/types';

/**
 * Zones Management Screen
 * Route: /app/profile/zones.tsx
 *
 * Le livreur choisit les zones qu'il couvre parmi les zones de la plateforme
 * (créées automatiquement à la saisie des colis). Le choix est enregistré sur
 * la plateforme : l'exploitation voit le livreur dans ces zones et le propose
 * en premier pour leurs colis.
 */
export default function ZonesManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [driver, setDriver] = useState<Driver | null>(null);
  const [allZones, setAllZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingZoneId, setUpdatingZoneId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let isMounted = true;
    Promise.all([driversService.getCurrentDriver(), driversService.getAllZones()])
      .then(([currentDriver, zones]) => {
        if (!isMounted) return;
        setDriver(currentDriver);
        setAllZones(zones);
      })
      .catch(() => {
        if (!isMounted) return;
        Alert.alert('Erreur', 'Impossible de charger les zones.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const assignedZoneIds = new Set(driver?.zones?.map((z) => z.id) || []);

  // Mes zones d'abord, puis par gouvernorat ; recherche sur nom et gouvernorat.
  const visibleZones = useMemo(() => {
    const q = search.trim().toLowerCase();
    const mine = new Set(driver?.zones?.map((z) => z.id) || []);
    return allZones
      .filter((z) => !q || `${z.name} ${z.governorate ?? ''}`.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          Number(mine.has(b.id)) - Number(mine.has(a.id)) ||
          (a.governorate ?? '').localeCompare(b.governorate ?? '', 'fr') ||
          a.name.localeCompare(b.name, 'fr')
      );
  }, [allZones, driver, search]);

  const handleToggleZone = async (zone: Zone) => {
    if (updatingZoneId) return;

    setUpdatingZoneId(zone.id);
    try {
      let updated: Driver;
      if (assignedZoneIds.has(zone.id)) {
        if (assignedZoneIds.size <= 1) {
          Alert.alert(
            'Action impossible',
            'Vous devez avoir au moins une zone assignée à votre profil.'
          );
          setUpdatingZoneId(null);
          return;
        }
        updated = await driversService.removeDriverZone(zone.id);
      } else {
        updated = await driversService.addDriverZone(zone.id);
      }
      setDriver(updated);
    } catch {
      Alert.alert('Erreur', 'Impossible de modifier la zone.');
    } finally {
      setUpdatingZoneId(null);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Dark Header */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + spacing.xs, 16) }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.inverse} />
          </TouchableOpacity>

          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>Gérer mes Zones</Text>
            <Text style={styles.headerSubtitle}>
              {assignedZoneIds.size} zone{assignedZoneIds.size > 1 ? 's' : ''} assignée
              {assignedZoneIds.size > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Body Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom + spacing.xl, 32) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={colors.status.info} />
          <Text style={styles.infoBannerText}>
            Choisissez les zones que vous couvrez. L’exploitation vous proposera en priorité pour
            les colis de ces zones.
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.text.secondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher une délégation ou un gouvernorat"
            placeholderTextColor={colors.text.secondary}
            style={styles.searchInput}
            autoCorrect={false}
            accessibilityLabel="Rechercher une zone"
          />
        </View>

        {loading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Chargement des zones...</Text>
          </View>
        ) : (
          <View style={styles.zonesList}>
            {visibleZones.length === 0 && (
              <Text style={styles.loadingText}>
                {allZones.length === 0
                  ? 'Aucune zone pour l’instant : elles apparaissent avec les premiers colis.'
                  : 'Aucune zone ne correspond à la recherche.'}
              </Text>
            )}
            {visibleZones.map((zone) => {
              const isAssigned = assignedZoneIds.has(zone.id);
              const isProcessing = updatingZoneId === zone.id;

              return (
                <View
                  key={zone.id}
                  style={[styles.zoneCard, isAssigned && styles.zoneCardAssigned]}
                >
                  <View style={styles.zoneInfoLeft}>
                    <View
                      style={[styles.zoneIconCircle, isAssigned && styles.zoneIconCircleAssigned]}
                    >
                      <Ionicons
                        name="location"
                        size={18}
                        color={isAssigned ? colors.primary : colors.text.secondary}
                      />
                    </View>
                    <View style={styles.zoneTextGroup}>
                      <Text style={styles.zoneName}>{zone.name}</Text>
                      <Text style={styles.zoneCode}>{zone.governorate || zone.code || ''}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleToggleZone(zone)}
                    disabled={isProcessing}
                    style={[
                      styles.toggleButton,
                      isAssigned ? styles.toggleButtonRemove : styles.toggleButtonAdd,
                    ]}
                  >
                    {isProcessing ? (
                      <ActivityIndicator
                        size="small"
                        color={isAssigned ? colors.status.danger : colors.text.inverse}
                      />
                    ) : (
                      <>
                        <Ionicons
                          name={isAssigned ? 'checkmark' : 'add'}
                          size={16}
                          color={isAssigned ? colors.status.danger : colors.text.inverse}
                        />
                        <Text
                          style={[
                            styles.toggleButtonText,
                            isAssigned ? styles.toggleButtonTextRemove : styles.toggleButtonTextAdd,
                          ]}
                        >
                          {isAssigned ? 'Retirer' : 'Ajouter'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.body,
  },
  headerContainer: {
    backgroundColor: colors.background.header,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    ...shadows.header,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h2,
    fontSize: 20,
    color: colors.text.inverse,
    fontWeight: '800',
  },
  headerSubtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoBannerText: {
    ...typography.caption,
    color: colors.text.primary,
    flex: 1,
    lineHeight: 18,
  },
  loadingWrapper: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  zonesList: {
    gap: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.12)',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    ...typography.body,
    color: colors.text.primary,
  },
  zoneCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  zoneCardAssigned: {
    borderColor: 'rgba(227, 30, 43, 0.3)',
  },
  zoneInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  zoneIconCircle: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneIconCircleAssigned: {
    backgroundColor: 'rgba(227, 30, 43, 0.08)',
  },
  zoneTextGroup: {
    flex: 1,
  },
  zoneName: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '700',
  },
  zoneCode: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 11,
    marginTop: 1,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
    gap: 4,
    minWidth: 84,
    justifyContent: 'center',
  },
  toggleButtonAdd: {
    backgroundColor: colors.primary,
  },
  toggleButtonRemove: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.status.danger,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  toggleButtonTextAdd: {
    color: colors.text.inverse,
  },
  toggleButtonTextRemove: {
    color: colors.status.danger,
  },
});
