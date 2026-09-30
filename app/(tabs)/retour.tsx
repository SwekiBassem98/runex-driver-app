import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { EmptyState, BottomNav, BottomNavTab, SecondaryButton, ParcelListItem } from '@/components';
import { useActiveRunsheet } from '@/hooks';
import { formatTND } from '@/types';

/**
 * RUNEX Driver Returned Parcels Screen (Retours de Tournée)
 * Route: /app/(tabs)/retour.tsx
 *
 * Sourced directly from the same active-runsheet data via useActiveRunsheet(),
 * filtering parcels with status 'returned' (and 'cancelled').
 * Displays each parcel's return reason and uses shared <ParcelListItem>.
 */
export default function RetourScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Shared active runsheet hook
  const {
    parcels: allParcels,
    loading,
    refreshing,
    noActiveRunsheet,
    refresh,
  } = useActiveRunsheet();

  // Search filter query
  const [searchQuery, setSearchQuery] = useState('');

  // Extract returned parcels from active runsheet
  const returnedParcels = useMemo(() => {
    return allParcels.filter((p) => p.status === 'returned' || p.status === 'cancelled');
  }, [allParcels]);

  // Client-side search filtering over returned parcels
  const filteredReturnedParcels = useMemo(() => {
    if (!searchQuery.trim()) {
      return returnedParcels;
    }
    const q = searchQuery.trim().toLowerCase();
    return returnedParcels.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.clientPhone.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')) ||
        p.address.toLowerCase().includes(q) ||
        (p.returnReason && p.returnReason.toLowerCase().includes(q))
    );
  }, [returnedParcels, searchQuery]);

  // Total COD value of returned parcels
  const totalReturnedAmount = useMemo(() => {
    return returnedParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);
  }, [returnedParcels]);

  const returnedCount = returnedParcels.length;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ============================================================== */}
      {/* HEADER (Dark): Title, Live Count, Tournée Link & Refresh       */}
      {/* ============================================================== */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + spacing.xs, 16) }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>Retours</Text>
            <Text style={styles.headerCountSubtitle}>
              {loading
                ? 'Chargement...'
                : `${returnedCount} colis retourné${returnedCount > 1 ? 's' : ''}`}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {/* Refresh icon button */}
            <TouchableOpacity activeOpacity={0.75} onPress={refresh} style={styles.refreshButton}>
              <Ionicons name="refresh-outline" size={20} color={colors.text.inverse} />
            </TouchableOpacity>

            {/* Quick link to Runsheet */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/runsheet')}
              style={styles.runsheetPillBtn}
            >
              <Ionicons name="document-text-outline" size={15} color={colors.text.inverse} />
              <Text style={styles.runsheetPillText}>Tournée</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ============================================================== */}
      {/* SUMMARY BANNER & SEARCH BAR                                    */}
      {/* ============================================================== */}
      <View style={styles.controlsSection}>
        {/* Returned Parcels Metric Strip */}
        <View style={styles.metricCard}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Total colis retournés</Text>
            <Text style={styles.metricValue}>{returnedCount}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Montant COD non perçu</Text>
            <Text style={styles.metricValueAmount}>{formatTND(totalReturnedAmount)}</Text>
          </View>
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
            placeholder="Rechercher par code, client, motif..."
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
      </View>

      {/* ============================================================== */}
      {/* LIST OF RETURNED PARCELS                                        */}
      {/* ============================================================== */}
      <ScrollView
        style={styles.listScrollView}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Chargement des retours...</Text>
          </View>
        ) : noActiveRunsheet ? (
          /* Case 1: No active runsheet */
          <EmptyState
            title="Aucune tournée active"
            description="Vous n'avez pas de feuille de route assignée actuellement. Contactez votre agence pour démarrer une tournée."
            action={
              <SecondaryButton
                title="Actualiser"
                iconName="refresh"
                size="sm"
                fullWidth={false}
                onPress={refresh}
              />
            }
          />
        ) : returnedParcels.length === 0 ? (
          /* Case 2: 0 returns in the active runsheet */
          <EmptyState
            title="Aucun retour dans cette tournée"
            description="Tous les colis de votre tournée active sont soit livrés, soit en cours de livraison. Aucun retour enregistré."
            action={
              <SecondaryButton
                title="Voir la tournée"
                iconName="document-text-outline"
                size="sm"
                fullWidth={false}
                onPress={() => router.push('/(tabs)/runsheet')}
              />
            }
          />
        ) : filteredReturnedParcels.length === 0 ? (
          /* Case 3: Filter / search matched 0 parcels */
          <EmptyState
            title="Aucun colis trouvé"
            description="Aucun colis retourné ne correspond à votre recherche."
            action={
              <SecondaryButton
                title="Effacer la recherche"
                iconName="close-outline"
                size="sm"
                fullWidth={false}
                onPress={() => setSearchQuery('')}
              />
            }
          />
        ) : (
          /* Case 4: Populated List of Returned Parcels */
          filteredReturnedParcels.map((parcel) => (
            <ParcelListItem
              key={parcel.id}
              parcel={parcel}
              showReturnReason={true}
              onPress={(p) => router.push(`/runsheet/${p.id}`)}
            />
          ))
        )}
      </ScrollView>

      {/* Persistent Bottom Navigation with Retour Active */}
      <BottomNav
        activeTab="retour"
        onTabPress={(tab: BottomNavTab) => {
          if (tab === 'accueil') {
            router.push('/(tabs)/home');
          } else if (tab === 'runsheet') {
            router.push('/(tabs)/runsheet');
          } else if (tab === 'pickup') {
            router.push('/(tabs)/pickup');
          } else if (tab === 'scanner') {
            router.push('/(tabs)/scanner');
          }
        }}
        badges={{
          retour: returnedCount,
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
  runsheetPillBtn: {
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
  runsheetPillText: {
    color: colors.text.inverse,
    fontWeight: '700',
    fontSize: 13,
  },

  // Controls Area
  controlsSection: {
    backgroundColor: colors.background.body,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  metricValue: {
    ...typography.h2,
    fontSize: 20,
    color: colors.text.primary,
    fontWeight: '800',
    marginTop: 2,
  },
  metricValueAmount: {
    ...typography.h3,
    fontSize: 17,
    color: colors.status.danger,
    fontWeight: '800',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.md,
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
    marginBottom: spacing.xs,
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
});
