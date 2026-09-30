import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import {
  SegmentedTabs,
  Badge,
  BadgeStatus,
  EmptyState,
  BottomNav,
  BottomNavTab,
  SecondaryButton,
} from '@/components';
import { runsheetsService } from '@/services/runsheets.service';
import { driversService } from '@/services/drivers.service';
import { ParcelStatus, Runsheet, Zone, formatTND } from '@/types';
import { useUiStore } from '@/store/ui.store';

/**
 * RUNEX Driver Active Runsheet Screen (Tournée)
 * Route: /app/(tabs)/runsheet.tsx
 *
 * Fetches active runsheet once on mount, preserves the full Runsheet object in state,
 * and performs all filtering and searching client-side in-memory.
 */
export default function RunsheetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeStatusFilter, setActiveStatusFilter } = useUiStore();

  // Full Active Runsheet object preserved in screen state
  const [activeRunsheet, setActiveRunsheet] = useState<Runsheet | null>(null);
  const [noActiveRunsheet, setNoActiveRunsheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [availableZones, setAvailableZones] = useState<Zone[]>([]);
  const [zoneModalVisible, setZoneModalVisible] = useState(false);

  // Fetch active runsheet once on mount
  useEffect(() => {
    let isMounted = true;
    runsheetsService
      .getActiveRunsheet()
      .then((data) => {
        if (!isMounted) return;
        if (!data || data.status !== 'active') {
          setNoActiveRunsheet(true);
          setActiveRunsheet(null);
        } else {
          setActiveRunsheet(data);
          setNoActiveRunsheet(false);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setNoActiveRunsheet(true);
        setActiveRunsheet(null);
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
  }, []);

  // Fetch zones from driver profile
  useEffect(() => {
    driversService
      .getDriverZones()
      .then((zones) => setAvailableZones(zones))
      .catch(() => {});
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    runsheetsService
      .getActiveRunsheet()
      .then((data) => {
        if (!data || data.status !== 'active') {
          setNoActiveRunsheet(true);
          setActiveRunsheet(null);
        } else {
          setActiveRunsheet(data);
          setNoActiveRunsheet(false);
        }
      })
      .catch(() => {
        setNoActiveRunsheet(true);
        setActiveRunsheet(null);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  const allParcels = useMemo(() => activeRunsheet?.parcels || [], [activeRunsheet]);

  // Compute live counts per tab from the loaded runsheet
  const tabs = useMemo(
    () => [
      { id: 'all', label: 'Tous', count: allParcels.length },
      {
        id: 'in_transit',
        label: 'En livraison',
        count: allParcels.filter(
          (p) => p.status === 'in_transit' || p.status === 'assigned' || p.status === 'pending'
        ).length,
      },
      {
        id: 'delivered',
        label: 'Livrés',
        count: allParcels.filter(
          (p) => p.status === 'delivered' || p.status === 'partially_delivered'
        ).length,
      },
      {
        id: 'postponed',
        label: 'Reportés',
        count: allParcels.filter((p) => p.status === 'postponed').length,
      },
      {
        id: 'returned',
        label: 'Retournés',
        count: allParcels.filter((p) => p.status === 'returned' || p.status === 'cancelled').length,
      },
    ],
    [allParcels]
  );

  // In-memory Client-Side Filtering & Search over the active runsheet
  const filteredParcels = useMemo(() => {
    let result = allParcels;

    // 1. Status Filter
    if (activeStatusFilter && activeStatusFilter !== 'all') {
      if (activeStatusFilter === 'in_transit') {
        result = result.filter(
          (p) => p.status === 'in_transit' || p.status === 'assigned' || p.status === 'pending'
        );
      } else if (activeStatusFilter === 'delivered') {
        result = result.filter(
          (p) => p.status === 'delivered' || p.status === 'partially_delivered'
        );
      } else if (activeStatusFilter === 'postponed') {
        result = result.filter((p) => p.status === 'postponed');
      } else if (activeStatusFilter === 'returned') {
        result = result.filter((p) => p.status === 'returned' || p.status === 'cancelled');
      } else if (activeStatusFilter === 'relanced') {
        result = result.filter((p) => p.status === 'exchanged');
      } else {
        result = result.filter((p) => p.status === activeStatusFilter);
      }
    }

    // 2. Zone Filter
    if (selectedZone) {
      result = result.filter((p) => p.zoneId === selectedZone.id);
    }

    // 3. Search Query Filter (code, client name, phone, address)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q) ||
          p.clientPhone.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')) ||
          p.address.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allParcels, activeStatusFilter, selectedZone, searchQuery]);

  const handleResetFilters = () => {
    setActiveStatusFilter('all');
    setSelectedZone(null);
    setSearchQuery('');
  };

  const getStatusBadge = (status: ParcelStatus): { label: string; badgeStatus: BadgeStatus } => {
    switch (status) {
      case 'delivered':
        return { label: 'Livré', badgeStatus: 'delivered' };
      case 'in_transit':
      case 'assigned':
      case 'pending':
        return { label: 'En livraison', badgeStatus: 'inDelivery' };
      case 'postponed':
        return { label: 'Reporté', badgeStatus: 'postponed' };
      case 'returned':
      case 'cancelled':
        return { label: 'Retour', badgeStatus: 'returned' };
      case 'partially_delivered':
        return { label: 'Partiel', badgeStatus: 'warning' };
      case 'exchanged':
        return { label: 'Relancé', badgeStatus: 'neutral' };
      default:
        return { label: status, badgeStatus: 'info' };
    }
  };

  const parcelCount = allParcels.length;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ============================================================== */}
      {/* HEADER (Dark): Title, Live Count, Refresh, and "Zones" Pill    */}
      {/* ============================================================== */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + spacing.xs, 16) }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>Runsheet</Text>
            <Text style={styles.headerCountSubtitle}>
              {loading ? 'Chargement...' : `${parcelCount} colis`}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {/* Refresh icon button */}
            <TouchableOpacity activeOpacity={0.75} onPress={onRefresh} style={styles.refreshButton}>
              <Ionicons name="refresh-outline" size={20} color={colors.text.inverse} />
            </TouchableOpacity>

            {/* "Zones" Pill Button (top right) */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setZoneModalVisible(true)}
              style={styles.zonesPillBtn}
            >
              <Ionicons name="map-outline" size={16} color={colors.text.inverse} />
              <Text style={styles.zonesPillText}>
                {selectedZone ? selectedZone.name.replace('Zone ', '') : 'Zones'}
              </Text>
              {selectedZone && <View style={styles.activeZoneDot} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ============================================================== */}
      {/* CONTROLS AREA (Below header): Tabs, Search Bar, Zone Select     */}
      {/* ============================================================== */}
      <View style={styles.controlsSection}>
        {/* <SegmentedTabs>: Tous / En livraison / Livrés / Reportés / Retournés */}
        <View style={styles.tabsWrapper}>
          <SegmentedTabs
            tabs={tabs}
            activeTab={activeStatusFilter || 'all'}
            onTabChange={(id) => setActiveStatusFilter(id)}
            variant="dark"
          />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.text.secondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par code, téléphone, client..."
            placeholderTextColor={colors.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.text.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Zone Filter Dropdown Row */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setZoneModalVisible(true)}
          style={styles.zoneDropdownRow}
        >
          <View style={styles.zoneDropdownLeft}>
            <View
              style={[
                styles.zoneIndicatorDot,
                { backgroundColor: selectedZone ? colors.primary : colors.text.secondary },
              ]}
            />
            <Text style={styles.zoneDropdownText}>
              {selectedZone ? selectedZone.name : 'Toutes les Zones'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* ============================================================== */}
      {/* PARCEL LIST (Client-Side Rendered)                              */}
      {/* ============================================================== */}
      <ScrollView
        style={styles.listScrollView}
        contentContainerStyle={styles.listContent}
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
            <Text style={styles.loadingText}>Chargement de la tournée...</Text>
          </View>
        ) : noActiveRunsheet ? (
          /* Case 1: No active runsheet at all */
          <EmptyState
            title="Aucune tournée active"
            description="Vous n'avez pas de feuille de route assignée actuellement. Contactez votre agence pour démarrer une tournée."
            action={
              <SecondaryButton
                title="Actualiser"
                iconName="refresh"
                size="sm"
                fullWidth={false}
                onPress={onRefresh}
              />
            }
          />
        ) : allParcels.length === 0 ? (
          /* Case 2: Active runsheet has 0 parcels */
          <EmptyState
            title="Aucun colis prévu"
            description="Votre feuille de route active est vide pour le moment."
            action={
              <SecondaryButton
                title="Actualiser"
                iconName="refresh"
                size="sm"
                fullWidth={false}
                onPress={onRefresh}
              />
            }
          />
        ) : filteredParcels.length === 0 ? (
          /* Case 3: In-memory filtered search returned 0 results */
          <EmptyState
            title="Aucun colis trouvé"
            description="Aucun colis ne correspond à vos critères de recherche ou de filtre."
            action={
              <SecondaryButton
                title="Réinitialiser les filtres"
                iconName="close-outline"
                size="sm"
                fullWidth={false}
                onPress={handleResetFilters}
              />
            }
          />
        ) : (
          /* Case 4: Populated List */
          filteredParcels.map((parcel) => {
            const badge = getStatusBadge(parcel.status);

            return (
              <TouchableOpacity
                key={parcel.id}
                activeOpacity={0.8}
                onPress={() => router.push(`/runsheet/${parcel.id}`)}
                style={styles.parcelCard}
              >
                {/* Top Row: Code, Sequence Order, Status Badge */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.codeGroup}>
                    <Text style={styles.parcelCode}>{parcel.code}</Text>
                    {parcel.sequenceOrder && (
                      <View style={styles.seqPill}>
                        <Text style={styles.seqPillText}>#{parcel.sequenceOrder}</Text>
                      </View>
                    )}
                  </View>
                  <Badge label={badge.label} status={badge.badgeStatus} dot size="sm" />
                </View>

                {/* Client Name */}
                <Text style={styles.clientName} numberOfLines={1}>
                  {parcel.clientName}
                </Text>

                {/* Address (Truncated) */}
                <View style={styles.addressRow}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={colors.text.secondary}
                    style={styles.addressIcon}
                  />
                  <Text style={styles.addressText} numberOfLines={1}>
                    {parcel.address}
                  </Text>
                </View>

                {/* Bottom Row: Phone & COD Amount */}
                <View style={styles.cardFooterRow}>
                  <View style={styles.phoneGroup}>
                    <Ionicons name="call-outline" size={13} color={colors.text.secondary} />
                    <Text style={styles.phoneText}>{parcel.clientPhone}</Text>
                  </View>

                  {parcel.codAmount !== undefined && parcel.codAmount > 0 ? (
                    <Text style={styles.codAmountText}>{formatTND(parcel.codAmount)}</Text>
                  ) : (
                    <Text style={styles.noCodText}>Payé d&apos;avance</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* ZONE FILTER BOTTOM SHEET / MODAL                               */}
      {/* ============================================================== */}
      <Modal
        visible={zoneModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setZoneModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setZoneModalVisible(false)}
          />

          <View
            style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom + spacing.lg, 24) }]}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Filtrer par Zone</Text>
                <Text style={styles.modalSubtitle}>Zones assignées à votre profil livreur</Text>
              </View>
              <TouchableOpacity
                onPress={() => setZoneModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Option: Toutes les Zones */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setSelectedZone(null);
                setZoneModalVisible(false);
              }}
              style={[
                styles.zoneOptionItem,
                selectedZone === null && styles.zoneOptionItemSelected,
              ]}
            >
              <View style={styles.zoneOptionLeft}>
                <Ionicons
                  name="grid-outline"
                  size={18}
                  color={selectedZone === null ? colors.primary : colors.text.secondary}
                />
                <Text
                  style={[
                    styles.zoneOptionName,
                    selectedZone === null && styles.zoneOptionNameSelected,
                  ]}
                >
                  Toutes les Zones
                </Text>
              </View>
              {selectedZone === null && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>

            {/* Driver Assigned Zones */}
            {availableZones.map((zone) => {
              const isSelected = selectedZone?.id === zone.id;
              const countInZone = allParcels.filter((p) => p.zoneId === zone.id).length;

              return (
                <TouchableOpacity
                  key={zone.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedZone(zone);
                    setZoneModalVisible(false);
                  }}
                  style={[styles.zoneOptionItem, isSelected && styles.zoneOptionItemSelected]}
                >
                  <View style={styles.zoneOptionLeft}>
                    <Ionicons
                      name="location"
                      size={18}
                      color={isSelected ? colors.primary : colors.text.secondary}
                    />
                    <View>
                      <Text
                        style={[styles.zoneOptionName, isSelected && styles.zoneOptionNameSelected]}
                      >
                        {zone.name}
                      </Text>
                      {zone.code && <Text style={styles.zoneOptionCode}>{zone.code}</Text>}
                    </View>
                  </View>

                  <View style={styles.zoneOptionRight}>
                    <View style={styles.zoneCountPill}>
                      <Text style={styles.zoneCountText}>{countInZone}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Persistent Bottom Navigation with Runsheet Active */}
      <BottomNav
        activeTab="runsheet"
        onTabPress={(tab: BottomNavTab) => {
          if (tab === 'accueil') {
            router.push('/(tabs)/home');
          } else if (tab === 'pickup') {
            router.push('/(tabs)/pickup');
          } else if (tab === 'scanner') {
            router.push('/(tabs)/scanner');
          }
        }}
        badges={{
          runsheet: allParcels.filter((p) => p.status === 'in_transit').length,
        }}
      />
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
    paddingBottom: spacing.md,
    ...shadows.header,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.inverse,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerCountSubtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zonesPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F2B48',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  zonesPillText: {
    color: colors.text.inverse,
    fontWeight: '700',
    fontSize: 13,
  },
  activeZoneDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },

  // Controls Area
  controlsSection: {
    backgroundColor: colors.background.body,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  tabsWrapper: {
    marginBottom: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs + 2,
    ...shadows.subtle,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  zoneDropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  zoneDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  zoneIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
  },
  zoneDropdownText: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '600',
  },

  // List Area
  listScrollView: {
    flex: 1,
    backgroundColor: colors.background.body,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxxl * 2,
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

  // Parcel Card
  parcelCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  codeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  parcelCode: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  seqPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  seqPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  clientName: {
    ...typography.h3,
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addressIcon: {
    marginRight: 4,
  },
  addressText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontSize: 13,
    flex: 1,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  phoneGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  codAmountText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '800',
    color: colors.status.success,
  },
  noCodText: {
    ...typography.caption,
    color: colors.text.muted,
    fontStyle: 'italic',
  },

  // Modal / Bottom Sheet
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    ...shadows.floating,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    fontSize: 20,
    color: colors.text.primary,
    fontWeight: '800',
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  zoneOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  zoneOptionItemSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(227, 30, 43, 0.04)',
  },
  zoneOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  zoneOptionName: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '600',
  },
  zoneOptionNameSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  zoneOptionCode: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 11,
  },
  zoneOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  zoneCountPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  zoneCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.secondary,
  },
});
