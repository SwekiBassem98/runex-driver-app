import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '@/theme';
import {
  Screen,
  SegmentedTabs,
  Badge,
  BadgeStatus,
  EmptyState,
  BottomNav,
  BottomNavTab,
} from '@/components';
import { runsheetsService } from '@/services/runsheets.service';
import { Parcel, ParcelStatus, formatTND } from '@/types';
import { useUiStore } from '@/store/ui.store';

/**
 * RUNEX Runsheet Screen (Tournée)
 * Route: /app/(tabs)/runsheet.tsx (accessible via /runsheet)
 */
export default function RunsheetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string }>();
  const { activeStatusFilter, setActiveStatusFilter } = useUiStore();

  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sync initial query parameter if provided
  useEffect(() => {
    if (params.status) {
      setActiveStatusFilter(params.status);
    }
  }, [params.status, setActiveStatusFilter]);

  useEffect(() => {
    let isMounted = true;
    runsheetsService
      .getActiveRunsheet()
      .then((data) => {
        if (!isMounted) return;
        setParcels(data.parcels);
      })
      .catch(() => {})
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await runsheetsService.getActiveRunsheet();
      setParcels(data.parcels);
    } catch {
      //
    } finally {
      setRefreshing(false);
    }
  };

  const tabs = [
    { id: 'all', label: 'Tous', count: parcels.length },
    {
      id: 'in_transit',
      label: 'En livraison',
      count: parcels.filter((p) => p.status === 'in_transit' || p.status === 'assigned').length,
    },
    {
      id: 'delivered',
      label: 'Livrés',
      count: parcels.filter((p) => p.status === 'delivered' || p.status === 'partially_delivered')
        .length,
    },
    {
      id: 'postponed',
      label: 'Reportés',
      count: parcels.filter((p) => p.status === 'postponed').length,
    },
    {
      id: 'returned',
      label: 'Retours',
      count: parcels.filter((p) => p.status === 'returned').length,
    },
  ];

  const filteredParcels = parcels.filter((p) => {
    if (activeStatusFilter === 'all' || !activeStatusFilter) return true;
    if (activeStatusFilter === 'in_transit') {
      return p.status === 'in_transit' || p.status === 'assigned' || p.status === 'pending';
    }
    if (activeStatusFilter === 'delivered') {
      return p.status === 'delivered' || p.status === 'partially_delivered';
    }
    if (activeStatusFilter === 'postponed') return p.status === 'postponed';
    if (activeStatusFilter === 'returned') return p.status === 'returned';
    if (activeStatusFilter === 'relanced') return p.status === 'exchanged';
    return p.status === activeStatusFilter;
  });

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

  return (
    <Screen
      title="Runsheet"
      subtitle="Feuille de route active"
      scrollable={false}
      bottomNav={
        <BottomNav
          activeTab="runsheet"
          onTabPress={(tab: BottomNavTab) => {
            if (tab === 'accueil') router.push('/(tabs)/home');
            if (tab === 'scanner') router.push('/_dev/components');
          }}
          badges={{
            runsheet: parcels.filter((p) => p.status === 'in_transit').length,
          }}
        />
      }
    >
      <View style={styles.tabsContainer}>
        <SegmentedTabs
          tabs={tabs}
          activeTab={activeStatusFilter || 'all'}
          onTabChange={(id) => setActiveStatusFilter(id)}
          variant="dark"
        />
      </View>

      <ScrollView
        style={styles.listContainer}
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
        {filteredParcels.length === 0 && !loading ? (
          <EmptyState
            title="Aucun colis trouvé"
            description="Aucun colis ne correspond à ce filtre pour votre tournée active."
          />
        ) : (
          filteredParcels.map((parcel) => {
            const badge = getStatusBadge(parcel.status);
            return (
              <View key={parcel.id} style={styles.parcelCard}>
                <View style={styles.cardTopRow}>
                  <View style={styles.codeGroup}>
                    <Text style={styles.parcelCode}>{parcel.code}</Text>
                    {parcel.sequenceOrder && (
                      <View style={styles.seqBadge}>
                        <Text style={styles.seqText}>#{parcel.sequenceOrder}</Text>
                      </View>
                    )}
                  </View>
                  <Badge label={badge.label} status={badge.badgeStatus} dot size="sm" />
                </View>

                <Text style={styles.clientName}>{parcel.clientName}</Text>
                <Text style={styles.clientAddress}>{parcel.address}</Text>

                <View style={styles.cardBottomRow}>
                  <View style={styles.phoneGroup}>
                    <Ionicons name="call-outline" size={14} color={colors.text.secondary} />
                    <Text style={styles.phoneText}>{parcel.clientPhone}</Text>
                  </View>
                  <Text style={styles.codAmountText}>{formatTND(parcel.codAmount || 0)}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listContainer: {
    flex: 1,
    backgroundColor: colors.background.body,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  parcelCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardTopRow: {
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
  seqBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  seqText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  clientName: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  clientAddress: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: 4,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
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
    fontWeight: '800',
    color: colors.status.success,
  },
});
