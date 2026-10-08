import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { StatCard, BottomNav, BottomNavTab, ErrorBanner } from '@/components';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { dashboardService } from '@/services/dashboard.service';
import { DashboardStats, ApiError, formatTND } from '@/types';

/**
 * RUNEX Driver Home Screen (Accueil)
 * Route: /app/(tabs)/home.tsx
 *
 * Header: Full RUNEX dark red-to-black gradient with rounded bottom corners,
 *         greeting, driver name from auth store, green online dot, cash collected block.
 * Body: Light background, "Runsheet du jour" title, 2-column grid of 6 StatCards
 *       with skeleton loading states and navigation to /runsheet pre-filtered.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const driver = useAuthStore((state) => state.driver);
  const setActiveStatusFilter = useUiStore((state) => state.setActiveStatusFilter);

  const [stats, setStats] = useState<DashboardStats>({
    totalParcels: 0,
    inTransit: 0,
    delivered: 0,
    reported: 0,
    returned: 0,
    relaunches: 0,
    cashCollected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let isMounted = true;
    dashboardService
      .getTodayStats()
      .then((data) => {
        if (!isMounted) return;
        setStats(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err as ApiError);
      })
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
      const data = await dashboardService.getTodayStats();
      setStats(data);
      setError(null);
    } catch (err: unknown) {
      setError(err as ApiError);
    } finally {
      setRefreshing(false);
    }
  };

  const handleNavigateToRunsheet = (status: string) => {
    setActiveStatusFilter(status);
    router.push({
      pathname: '/runsheet',
      params: { status },
    });
  };

  const driverFullName = driver?.fullName || '';
  const driverMatricule = driver?.matricule || '';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
        {/* ============================================================== */}
        {/* HEADER: Dark Red-to-Black Gradient with Rounded Bottom Corners */}
        {/* ============================================================== */}
        <LinearGradient
          colors={['#2A060A', '#120406', '#0A0A0A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerContainer, { paddingTop: Math.max(insets.top + spacing.xs, 16) }]}
        >
          {/* Top Row: Greeting & Online Status Indicator */}
          <View style={styles.headerTopRow}>
            <View style={styles.driverTextContainer}>
              <Text style={styles.greetingText}>Bonjour,</Text>
              <Text style={styles.driverNameText} numberOfLines={1}>
                {driverFullName}
              </Text>
              <Text style={styles.driverSubText}>{driverMatricule}</Text>
            </View>

            {/* Small green "online" status dot top right */}
            <View style={styles.onlineBadge}>
              <View style={styles.onlineRing}>
                <View style={styles.onlineDot} />
              </View>
              <Text style={styles.onlineLabel}>En service</Text>
            </View>
          </View>

          {/* Highlighted Stat Block: "Espèces encaissées" (Large & Prominent) */}
          <View style={styles.cashCollectedCard}>
            <View style={styles.cashIconContainer}>
              <Ionicons name="cash-outline" size={26} color={colors.cash.green} />
            </View>

            <View style={styles.cashTextGroup}>
              {loading && !refreshing ? (
                <View style={styles.cashSkeleton} />
              ) : (
                <Text style={styles.cashAmountText}>{formatTND(stats.cashCollected)}</Text>
              )}
              <Text style={styles.cashLabelText}>Espèces encaissées</Text>
            </View>

            <View style={styles.currencyBadge}>
              <Text style={styles.currencyBadgeText}>TND</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ============================================================== */}
        {/* BODY: Light Neutral Background */}
        {/* ============================================================== */}
        <View style={styles.bodyContainer}>
          {/* Error Banner fallback if API call fails */}
          {error && (
            <ErrorBanner
              type="generic"
              code={error.code || `${error.status || '500'}`}
              title="Erreur de chargement"
              message={error.message || 'Impossible de récupérer les statistiques du jour.'}
              onRetry={onRefresh}
              style={styles.errorBanner}
            />
          )}

          {/* "Runsheet du jour" Section Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Runsheet du jour</Text>
            {loading && refreshing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onRefresh}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="sync-outline" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* 2-Column Grid of 6 StatCards */}
          <View style={styles.statsGrid}>
            {/* 1. Total colis */}
            <View style={styles.gridColumn}>
              <StatCard
                label="Total colis"
                value={stats.totalParcels}
                variant="total"
                loading={loading}
                onPress={() => handleNavigateToRunsheet('all')}
              />
            </View>

            {/* 2. En livraison */}
            <View style={styles.gridColumn}>
              <StatCard
                label="En livraison"
                value={stats.inTransit}
                variant="inDelivery"
                loading={loading}
                onPress={() => handleNavigateToRunsheet('in_transit')}
              />
            </View>

            {/* 3. Livrés */}
            <View style={styles.gridColumn}>
              <StatCard
                label="Livrés"
                value={stats.delivered}
                variant="delivered"
                loading={loading}
                onPress={() => handleNavigateToRunsheet('delivered')}
              />
            </View>

            {/* 4. Reportés */}
            <View style={styles.gridColumn}>
              <StatCard
                label="Reportés"
                value={stats.reported}
                variant="postponed"
                loading={loading}
                onPress={() => handleNavigateToRunsheet('postponed')}
              />
            </View>

            {/* 5. Retours */}
            <View style={styles.gridColumn}>
              <StatCard
                label="Retours"
                value={stats.returned}
                variant="returned"
                loading={loading}
                onPress={() => handleNavigateToRunsheet('returned')}
              />
            </View>

            {/* 6. Relances */}
            <View style={styles.gridColumn}>
              <StatCard
                label="Relances"
                value={stats.relaunches}
                variant="relanced"
                loading={loading}
                onPress={() => handleNavigateToRunsheet('relanced')}
              />
            </View>
          </View>

          {/* Quick Action: Access Runsheet list */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleNavigateToRunsheet('all')}
            style={styles.openTourneeBtn}
          >
            <View style={styles.openTourneeLeft}>
              <View style={styles.tourneeIconBox}>
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.openTourneeTitle}>Voir la feuille de route active</Text>
                <Text style={styles.openTourneeSubtitle}>
                  {stats.totalParcels} colis assignés pour aujourd&apos;hui
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Persistent Bottom Navigation with Accueil Active */}
      <BottomNav
        activeTab="accueil"
        onTabPress={(tab: BottomNavTab) => {
          if (tab === 'runsheet') {
            router.push('/(tabs)/runsheet');
          } else if (tab === 'pickup') {
            router.push('/(tabs)/pickup');
          } else if (tab === 'scanner') {
            router.push('/(tabs)/scanner');
          } else if (tab === 'retour') {
            router.push('/(tabs)/retour');
          } else if (tab === 'profil') {
            router.push('/(tabs)/profile');
          }
        }}
        badges={{ runsheet: stats.inTransit, retour: stats.returned }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background.body,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Header Styles
  headerContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...shadows.header,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  driverTextContainer: {
    flex: 1,
    paddingRight: spacing.md,
  },
  greetingText: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  driverNameText: {
    ...typography.h1,
    color: colors.text.inverse,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  driverSubText: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11,
    marginTop: 3,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginTop: 4,
  },
  onlineRing: {
    width: 12,
    height: 12,
    borderRadius: radii.full,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.cash.green,
  },
  onlineLabel: {
    color: colors.cash.green,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.2,
  },

  // Highlighted Stat Block: Espèces encaissées
  cashCollectedCard: {
    backgroundColor: colors.cash.cardBg,
    borderRadius: radii.card,
    borderWidth: 1.2,
    borderColor: colors.cash.cardBorder,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.subtle,
  },
  cashIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cashTextGroup: {
    flex: 1,
  },
  cashAmountText: {
    ...typography.display,
    fontSize: 28,
    lineHeight: 34,
    color: colors.cash.green,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cashLabelText: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  cashSkeleton: {
    width: 140,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 4,
  },
  currencyBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  currencyBadgeText: {
    color: colors.cash.green,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },

  // Body Styles
  bodyContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    backgroundColor: colors.background.body,
  },
  errorBanner: {
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // 2-Column Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  gridColumn: {
    width: '50%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },

  // Quick Action Button
  openTourneeBtn: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  openTourneeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tourneeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(227, 30, 43, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openTourneeTitle: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '700',
  },
  openTourneeSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
