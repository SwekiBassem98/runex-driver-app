import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, shadows } from '@/theme';
import { Screen, StatCard, BottomNav, BottomNavTab, IconButton } from '@/components';
import { useAuthStore } from '@/store/auth.store';
import { dashboardService } from '@/services/dashboard.service';
import { DashboardStats, formatTND } from '@/types';

/**
 * RUNEX Driver Home Screen (Accueil)
 * Route: /app/(tabs)/home.tsx
 */
export default function HomeScreen() {
  const router = useRouter();
  const { driver, logout } = useAuthStore();

  const [stats, setStats] = useState<DashboardStats>({
    totalParcels: 0,
    inTransit: 0,
    delivered: 0,
    reported: 0,
    returned: 0,
    relaunches: 0,
    cashCollected: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    dashboardService
      .getDashboardStats()
      .then((data) => {
        if (isMounted) {
          setStats(data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await dashboardService.getDashboardStats();
      setStats(data);
    } catch {
      // Fallback
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const driverName = driver?.fullName || 'HAMZA MABROUK';
  const driverMatricule = driver?.matricule || '6383 TUN 181';
  const driverAgency = driver?.agency || 'Ben Arous';

  const headerCustomContent = (
    <View style={styles.headerWidget}>
      {/* Top row: Bonjour, Driver Name, Online status, Logout */}
      <View style={styles.headerTopRow}>
        <View style={styles.driverInfo}>
          <Text style={styles.greetingText}>Bonjour,</Text>
          <View style={styles.nameRow}>
            <Text style={styles.driverNameText}>{driverName}</Text>
            <View style={styles.onlineDot} />
          </View>
          <Text style={styles.driverMetaText}>
            {driverMatricule} • Agence {driverAgency}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <IconButton
            iconName="log-out-outline"
            size="sm"
            variant="dark"
            onPress={handleLogout}
            color={colors.primary}
          />
        </View>
      </View>

      {/* Cash collected banner card (Espèces encaissées) */}
      <View style={styles.cashCard}>
        <View style={styles.cashIconBox}>
          <Ionicons name="cash-outline" size={24} color={colors.cash.green} />
        </View>
        <View style={styles.cashDetails}>
          <Text style={styles.cashAmount}>{formatTND(stats.cashCollected)}</Text>
          <Text style={styles.cashLabel}>Espèces encaissées</Text>
        </View>
        <View style={styles.cashBadge}>
          <Text style={styles.cashBadgeText}>TND</Text>
        </View>
      </View>
    </View>
  );

  return (
    <Screen
      showHeader
      headerContent={headerCustomContent}
      scrollable={false}
      bottomNav={
        <BottomNav
          activeTab="accueil"
          onTabPress={(tab: BottomNavTab) => {
            if (tab === 'scanner') {
              router.push('/_dev/components');
            }
          }}
          badges={{ runsheet: stats.inTransit }}
        />
      }
    >
      <ScrollView
        style={styles.bodyScrollView}
        contentContainerStyle={styles.bodyContent}
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
        {/* Runsheet du jour Header */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Runsheet du jour</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onRefresh}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* 6 StatCards Grid (2 columns) */}
        <View style={styles.gridContainer}>
          <View style={styles.gridCol}>
            <StatCard
              label="Total colis"
              value={stats.totalParcels}
              variant="total"
              onPress={() => {}}
            />
          </View>
          <View style={styles.gridCol}>
            <StatCard
              label="En livraison"
              value={stats.inTransit}
              variant="inDelivery"
              onPress={() => {}}
            />
          </View>
          <View style={styles.gridCol}>
            <StatCard
              label="Livrés"
              value={stats.delivered}
              variant="delivered"
              onPress={() => {}}
            />
          </View>
          <View style={styles.gridCol}>
            <StatCard
              label="Reportés"
              value={stats.reported}
              variant="postponed"
              onPress={() => {}}
            />
          </View>
          <View style={styles.gridCol}>
            <StatCard
              label="Retours"
              value={stats.returned}
              variant="returned"
              onPress={() => {}}
            />
          </View>
          <View style={styles.gridCol}>
            <StatCard
              label="Relances"
              value={stats.relaunches}
              variant="relanced"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Dev navigation link to component gallery */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/_dev/components')}
          style={styles.devGalleryBanner}
        >
          <View style={styles.devBannerLeft}>
            <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
            <Text style={styles.devBannerText}>Visualiser le Component Gallery UI</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWidget: {
    paddingTop: spacing.xs,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  driverInfo: {
    flex: 1,
  },
  greetingText: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  driverNameText: {
    ...typography.h2,
    color: colors.text.inverse,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: '#10B981',
    marginLeft: 4,
  },
  driverMetaText: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
    fontSize: 11,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  cashCard: {
    backgroundColor: colors.cash.cardBg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.cash.cardBorder,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.subtle,
  },
  cashIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cashDetails: {
    flex: 1,
  },
  cashAmount: {
    ...typography.h2,
    color: colors.cash.green,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cashLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    marginTop: 1,
  },
  cashBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  cashBadgeText: {
    color: colors.cash.green,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 1,
  },
  bodyScrollView: {
    flex: 1,
    backgroundColor: colors.background.body,
  },
  bodyContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  gridCol: {
    width: '50%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
  devGalleryBanner: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.button,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  devBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  devBannerText: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '600',
  },
});
