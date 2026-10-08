import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTabNavigation } from '@/hooks/useTabNavigation';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import {
  SegmentedTabs,
  Badge,
  EmptyState,
  BottomNav,
  PrimaryButton,
  SecondaryButton,
} from '@/components';
import { ramassagesService } from '@/services/ramassages.service';
import { USE_MOCKS } from '@/config/env';
import { Pickup } from '@/types';

/**
 * RUNEX Driver Pickups Screen (Ramassages Fournisseurs)
 * Route: /app/(tabs)/pickup.tsx
 *
 * Structurally mirrors the Runsheet screen:
 * - Dark header: "Pickups" title, live count, hamburger menu icon + refresh icon top right.
 * - <SegmentedTabs>: Tous / En cours / Effectués (mapping to pending/confirmed).
 * - List of pickup cards: supplier name, address, zone badge, scheduled time, status badge.
 * - Tapping opens detail view with "Marquer comme récupéré" calling ramassagesService.confirm(id).
 * - Empty state: "Aucun pickup prévu", reusing <EmptyState>.
 * - Data via ramassagesService.list({ status }) with support for both empty and populated mock states.
 */
export default function PickupScreen() {
  const goToTab = useTabNavigation('pickup');
  const insets = useSafeAreaInsets();

  // Pickups data and loading state
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tab & search filtering
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail view state
  const [selectedPickup, setSelectedPickup] = useState<Pickup | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [parcelsCollected, setParcelsCollected] = useState('');

  // Hamburger / mock settings modal
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [mockState, setMockState] = useState<'populated' | 'empty'>(
    ramassagesService.getMockState()
  );

  // Initial fetch on mount
  useEffect(() => {
    let isMounted = true;
    ramassagesService
      .list()
      .then((data) => {
        if (isMounted) setPickups(data);
      })
      .catch(() => {
        if (isMounted) setPickups([]);
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

  // Fetch pickups via ramassagesService.list()
  const fetchPickups = useCallback(async () => {
    try {
      const data = await ramassagesService.list();
      setPickups(data);
    } catch {
      setPickups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPickups();
  };

  // Au retour du scanner : compteur de colis scannés à jour.
  useRefreshOnFocus(fetchPickups);

  // Switch between populated and empty mock states (to easily test both states)
  const handleToggleMockState = (targetState: 'populated' | 'empty') => {
    ramassagesService.setMockState(targetState);
    setMockState(targetState);
    setMenuModalVisible(false);
    setLoading(true);
    fetchPickups();
  };

  const handleResetMockData = () => {
    ramassagesService.resetMockData();
    setMockState('populated');
    setMenuModalVisible(false);
    setLoading(true);
    fetchPickups();
  };

  // Open detail view for a pickup
  const handleOpenDetail = (pickup: Pickup) => {
    setSelectedPickup(pickup);
    setParcelsCollected(pickup.parcelsCount ? String(pickup.parcelsCount) : '');
    setConfirmNotes('');
  };

  // Confirm pickup action
  const handleConfirmPickup = () => {
    if (!selectedPickup || confirming) return;
    // API réelle : seuls les colis scannés sont comptés. Clôturer sans en avoir
    // scanné un seul est presque toujours un oubli — on demande confirmation.
    if (!USE_MOCKS && !selectedPickup.pickedCount && Platform.OS !== 'web') {
      Alert.alert(
        'Aucun colis scanné',
        'Aucun colis n’a été scanné pour ce ramassage. Le clôturer quand même ?',
        [
          { text: 'Scanner les colis', style: 'cancel', onPress: () => goToTab('scanner') },
          { text: 'Clôturer', style: 'destructive', onPress: () => void doConfirmPickup() },
        ]
      );
      return;
    }
    void doConfirmPickup();
  };

  const doConfirmPickup = async () => {
    if (!selectedPickup) return;
    setConfirming(true);
    try {
      const count = parseInt(parcelsCollected, 10);
      const updated = await ramassagesService.confirm(selectedPickup.id, {
        parcelsCount: isNaN(count) ? selectedPickup.parcelsCount : count,
        notes: confirmNotes.trim() ? confirmNotes.trim() : undefined,
      });

      // Update in local state and refresh
      setPickups((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSelectedPickup(updated);
      Alert.alert(
        'Ramassage validé',
        `Le ramassage chez ${updated.supplierName} a été marqué comme récupéré.`
      );
    } catch (err: unknown) {
      Alert.alert(
        'Erreur',
        (err as { message?: string })?.message ||
          'Impossible de valider ce ramassage. Veuillez réessayer.'
      );
    } finally {
      setConfirming(false);
    }
  };

  const handleCallSupplier = (phone?: string) => {
    if (!phone) return;
    const clean = phone.replace(/\s+/g, '');
    Linking.openURL(`tel:${clean}`);
  };

  // Live counts for tabs
  const tabCounts = useMemo(() => {
    return {
      all: pickups.length,
      pending: pickups.filter((p) => p.status === 'pending').length,
      confirmed: pickups.filter((p) => p.status === 'confirmed').length,
    };
  }, [pickups]);

  // Segmented Tabs definition
  const tabs = useMemo(
    () => [
      { id: 'all', label: 'Tous', count: tabCounts.all },
      { id: 'pending', label: 'En cours', count: tabCounts.pending },
      { id: 'confirmed', label: 'Effectués', count: tabCounts.confirmed },
    ],
    [tabCounts]
  );

  // Filtered pickups list (Client-Side)
  const filteredPickups = useMemo(() => {
    let result = pickups;

    // Status filter
    if (activeTab !== 'all') {
      result = result.filter((p) => p.status === activeTab);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.supplierName.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          (p.zoneName && p.zoneName.toLowerCase().includes(q)) ||
          (p.supplierPhone && p.supplierPhone.includes(q))
      );
    }

    return result;
  }, [pickups, activeTab, searchQuery]);

  const totalCount = pickups.length;
  const pendingCount = tabCounts.pending;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ============================================================== */}
      {/* HEADER (Dark): Title, Live Count, Hamburger Menu & Refresh     */}
      {/* ============================================================== */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + spacing.xs, 16) }]}>
        <View style={styles.headerTopRow}>
          {/* Title & Live Count */}
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>Pickups</Text>
            <Text style={styles.headerCountSubtitle}>
              {loading ? 'Chargement...' : `${totalCount} pickup${totalCount > 1 ? 's' : ''}`}
            </Text>
          </View>

          {/* Top Right Action Icons: Hamburger Menu + Refresh Icon */}
          <View style={styles.headerActions}>
            {/* Hamburger Menu Icon (données de démonstration uniquement) */}
            {USE_MOCKS && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setMenuModalVisible(true)}
                style={styles.headerIconButton}
                accessibilityLabel="Menu Options"
              >
                <Ionicons name="menu-outline" size={22} color={colors.text.inverse} />
              </TouchableOpacity>
            )}

            {/* Refresh Icon */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onRefresh}
              style={styles.headerIconButton}
              accessibilityLabel="Actualiser les pickups"
            >
              <Ionicons name="refresh-outline" size={20} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ============================================================== */}
      {/* CONTROLS AREA: Segmented Tabs & Search Bar                      */}
      {/* ============================================================== */}
      <View style={styles.controlsSection}>
        {/* <SegmentedTabs>: Tous / En cours / Effectués */}
        <View style={styles.tabsWrapper}>
          <SegmentedTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as 'all' | 'pending' | 'confirmed')}
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
            placeholder="Rechercher par fournisseur, adresse, code..."
            placeholderTextColor={colors.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.text.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ============================================================== */}
      {/* PICKUPS LIST                                                    */}
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
            <Text style={styles.loadingText}>Chargement des ramassages...</Text>
          </View>
        ) : pickups.length === 0 ? (
          /* Case 1: Empty state ("Aucun pickup prévu") */
          <EmptyState
            title="Aucun pickup prévu"
            description="Vous n'avez aucun ramassage fournisseur prévu pour le moment."
            action={
              mockState === 'empty' ? (
                <SecondaryButton
                  title="Charger données de test"
                  iconName="download-outline"
                  size="sm"
                  fullWidth={false}
                  onPress={() => handleToggleMockState('populated')}
                />
              ) : (
                <SecondaryButton
                  title="Actualiser"
                  iconName="refresh"
                  size="sm"
                  fullWidth={false}
                  onPress={onRefresh}
                />
              )
            }
          />
        ) : filteredPickups.length === 0 ? (
          /* Case 2: Filter/Search yielded 0 results */
          <EmptyState
            title="Aucun pickup trouvé"
            description="Aucun ramassage ne correspond à vos critères de recherche ou de filtre."
            action={
              <SecondaryButton
                title="Réinitialiser les filtres"
                iconName="close-outline"
                size="sm"
                fullWidth={false}
                onPress={() => {
                  setActiveTab('all');
                  setSearchQuery('');
                }}
              />
            }
          />
        ) : (
          /* Case 3: List of pickup cards */
          filteredPickups.map((pickup) => {
            const isConfirmed = pickup.status === 'confirmed';

            return (
              <TouchableOpacity
                key={pickup.id}
                activeOpacity={0.8}
                onPress={() => handleOpenDetail(pickup)}
                style={styles.pickupCard}
              >
                {/* Top Row: Code, Zone Badge, Status Badge */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.codeZoneGroup}>
                    <Text style={styles.pickupCode}>{pickup.code}</Text>
                    {pickup.zoneName && (
                      <View style={styles.zonePill}>
                        <Text style={styles.zonePillText}>{pickup.zoneName}</Text>
                      </View>
                    )}
                  </View>

                  <Badge
                    label={isConfirmed ? 'Effectué' : 'En cours'}
                    status={isConfirmed ? 'delivered' : 'inDelivery'}
                    dot
                    size="sm"
                  />
                </View>

                {/* Supplier Name */}
                <Text style={styles.supplierName} numberOfLines={1}>
                  {pickup.supplierName}
                </Text>

                {/* Address */}
                <View style={styles.addressRow}>
                  <Ionicons
                    name="location-outline"
                    size={15}
                    color={colors.text.secondary}
                    style={styles.addressIcon}
                  />
                  <Text style={styles.addressText} numberOfLines={1}>
                    {pickup.address}
                  </Text>
                </View>

                {/* Bottom Row: Scheduled time, Parcels count, Tap hint */}
                <View style={styles.cardFooterRow}>
                  <View style={styles.metaGroup}>
                    {pickup.scheduledAt && (
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
                        <Text style={styles.metaText}>{pickup.scheduledAt}</Text>
                      </View>
                    )}

                    {pickup.parcelsCount !== undefined && (
                      <View style={styles.metaItem}>
                        <Ionicons name="cube-outline" size={14} color={colors.text.secondary} />
                        <Text style={styles.metaText}>
                          {pickup.parcelsCount} colis {isConfirmed ? 'récupérés' : 'prévus'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.viewDetailPill}>
                    <Text style={styles.viewDetailText}>Détails</Text>
                    <Ionicons name="chevron-forward" size={12} color={colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* DETAIL MODAL / SHEET                                           */}
      {/* ============================================================== */}
      <Modal
        visible={selectedPickup !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPickup(null)}
      >
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedPickup(null)}
          />

          <View
            style={[
              styles.detailSheet,
              { paddingBottom: Math.max(insets.bottom + spacing.lg, 24) },
            ]}
          >
            <View style={styles.sheetHandle} />

            {selectedPickup && (
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                {/* Sheet Header */}
                <View style={styles.detailHeader}>
                  <View style={styles.detailHeaderTitles}>
                    <View style={styles.codeZoneGroup}>
                      <Text style={styles.detailCode}>{selectedPickup.code}</Text>
                      {selectedPickup.zoneName && (
                        <View style={styles.zonePill}>
                          <Text style={styles.zonePillText}>{selectedPickup.zoneName}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.detailSupplierName}>{selectedPickup.supplierName}</Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => setSelectedPickup(null)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={22} color={colors.text.secondary} />
                  </TouchableOpacity>
                </View>

                {/* Status Row */}
                <View style={styles.statusRow}>
                  <Badge
                    label={selectedPickup.status === 'confirmed' ? 'Effectué' : 'En cours'}
                    status={selectedPickup.status === 'confirmed' ? 'delivered' : 'inDelivery'}
                    dot
                    size="md"
                  />
                  {selectedPickup.scheduledAt && (
                    <Text style={styles.scheduledNotice}>
                      Horaire prévu : {selectedPickup.scheduledAt}
                    </Text>
                  )}
                </View>

                {/* Contact & Location Details */}
                <View style={styles.detailCard}>
                  {/* Phone */}
                  {selectedPickup.supplierPhone && (
                    <View style={styles.detailInfoRow}>
                      <View style={styles.infoIconWrapper}>
                        <Ionicons name="call" size={16} color={colors.primary} />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Téléphone fournisseur</Text>
                        <Text style={styles.infoValue}>{selectedPickup.supplierPhone}</Text>
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleCallSupplier(selectedPickup.supplierPhone)}
                        style={styles.callBadgeBtn}
                      >
                        <Ionicons name="call" size={13} color={colors.text.inverse} />
                        <Text style={styles.callBadgeText}>Appeler</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Address */}
                  <View style={styles.detailInfoRow}>
                    <View style={styles.infoIconWrapper}>
                      <Ionicons name="location" size={16} color={colors.primary} />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Adresse d&apos;enlèvement</Text>
                      <Text style={styles.infoValue}>{selectedPickup.address}</Text>
                    </View>
                  </View>

                  {/* Parcels count */}
                  <View style={styles.detailInfoRow}>
                    <View style={styles.infoIconWrapper}>
                      <Ionicons name="cube" size={16} color={colors.primary} />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Nombre de colis estimé</Text>
                      <Text style={styles.infoValue}>{selectedPickup.parcelsCount ?? 0} colis</Text>
                    </View>
                  </View>

                  {/* Special Notes */}
                  {selectedPickup.notes && (
                    <View style={styles.notesContainer}>
                      <Ionicons
                        name="information-circle-outline"
                        size={16}
                        color={colors.text.secondary}
                      />
                      <Text style={styles.notesText}>{selectedPickup.notes}</Text>
                    </View>
                  )}
                </View>

                {/* Confirmation Section */}
                {selectedPickup.status === 'confirmed' ? (
                  /* Confirmed State Display */
                  <View style={styles.confirmedBanner}>
                    <View style={styles.confirmedIconCircle}>
                      <Ionicons name="checkmark" size={24} color={colors.status.success} />
                    </View>
                    <View style={styles.confirmedTextGroup}>
                      <Text style={styles.confirmedTitle}>Ramassage effectué</Text>
                      <Text style={styles.confirmedSubtitle}>
                        {selectedPickup.confirmedAt
                          ? `Validé à ${new Date(selectedPickup.confirmedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                          : 'Validé par le livreur'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  /* Pending Action Form */
                  <View style={styles.actionForm}>
                    <Text style={styles.formSectionTitle}>Validation de la récupération</Text>

                    {USE_MOCKS ? (
                      <>
                        {/* Number of parcels input */}
                        <Text style={styles.inputLabel}>Nombre de colis récupérés</Text>
                        <TextInput
                          style={styles.textInput}
                          keyboardType="number-pad"
                          value={parcelsCollected}
                          onChangeText={setParcelsCollected}
                          placeholder="Ex: 8"
                          placeholderTextColor={colors.text.muted}
                        />
                      </>
                    ) : (
                      <>
                        {/* Les colis collectés sont ceux scannés chez l'expéditeur */}
                        <Text style={styles.inputLabel}>
                          Colis scannés : {selectedPickup.pickedCount ?? 0}
                          {selectedPickup.estimatedCount
                            ? ` / ${selectedPickup.estimatedCount} annoncés`
                            : ''}
                        </Text>
                        <SecondaryButton
                          title="Scanner les colis"
                          iconName="scan-outline"
                          variant="outline"
                          onPress={() => {
                            setSelectedPickup(null);
                            goToTab('scanner');
                          }}
                          style={styles.confirmButton}
                        />
                      </>
                    )}

                    {/* Driver notes input */}
                    <Text style={styles.inputLabel}>Observations / Note (optionnel)</Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={confirmNotes}
                      onChangeText={setConfirmNotes}
                      placeholder="Ex: Scanné sur quai, emballages intacts..."
                      placeholderTextColor={colors.text.muted}
                      multiline
                      numberOfLines={3}
                    />

                    {/* "Marquer comme récupéré" button */}
                    <PrimaryButton
                      title="Marquer comme récupéré"
                      iconName="checkmark-circle-outline"
                      loading={confirming}
                      onPress={handleConfirmPickup}
                      style={styles.confirmButton}
                    />
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================== */}
      {/* HAMBURGER MENU / MOCK DATA SWITCHER MODAL                      */}
      {/* ============================================================== */}
      <Modal
        visible={menuModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuModalVisible(false)}
      >
        <View style={styles.menuOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setMenuModalVisible(false)}
          />

          <View style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Options & Données Mock</Text>
              <TouchableOpacity activeOpacity={0.75} onPress={() => setMenuModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.menuDescription}>
              Basculez entre les états pour tester l&apos;écran avec ou sans données :
            </Text>

            {/* Option 1: Populated State */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleToggleMockState('populated')}
              style={[
                styles.mockOptionItem,
                mockState === 'populated' && styles.mockOptionItemSelected,
              ]}
            >
              <View style={styles.mockOptionLeft}>
                <Ionicons
                  name="cube"
                  size={20}
                  color={mockState === 'populated' ? colors.primary : colors.text.secondary}
                />
                <View>
                  <Text
                    style={[
                      styles.mockOptionTitle,
                      mockState === 'populated' && styles.mockOptionTitleSelected,
                    ]}
                  >
                    État avec données (Peuplé)
                  </Text>
                  <Text style={styles.mockOptionSubtitle}>4 ramassages fournisseurs prêts</Text>
                </View>
              </View>
              {mockState === 'populated' && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>

            {/* Option 2: Empty State */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleToggleMockState('empty')}
              style={[
                styles.mockOptionItem,
                mockState === 'empty' && styles.mockOptionItemSelected,
              ]}
            >
              <View style={styles.mockOptionLeft}>
                <Ionicons
                  name="file-tray-outline"
                  size={20}
                  color={mockState === 'empty' ? colors.primary : colors.text.secondary}
                />
                <View>
                  <Text
                    style={[
                      styles.mockOptionTitle,
                      mockState === 'empty' && styles.mockOptionTitleSelected,
                    ]}
                  >
                    État vide (&quot;Aucun pickup prévu&quot;)
                  </Text>
                  <Text style={styles.mockOptionSubtitle}>Simule 0 ramassage prévu</Text>
                </View>
              </View>
              {mockState === 'empty' && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>

            {/* Reset mock data */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleResetMockData}
              style={styles.resetButton}
            >
              <Ionicons name="refresh" size={16} color={colors.primary} />
              <Text style={styles.resetButtonText}>Réinitialiser toutes les données mock</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* BOTTOM NAVIGATION                                              */}
      {/* ============================================================== */}
      <BottomNav
        activeTab="pickup"
        onTabPress={goToTab}
        badges={{
          pickup: pendingCount,
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
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
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

  // Pickup Card
  pickupCard: {
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
  codeZoneGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  pickupCode: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  zonePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  zonePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  supplierName: {
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
  metaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 12,
  },
  viewDetailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },

  // Detail Modal / Sheet
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    flex: 1,
  },
  detailSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    maxHeight: '90%',
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
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  detailHeaderTitles: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  detailCode: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.primary,
  },
  detailSupplierName: {
    ...typography.h2,
    fontSize: 18,
    color: colors.text.primary,
    fontWeight: '800',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  scheduledNotice: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: 'rgba(227, 30, 43, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 11,
  },
  infoValue: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  callBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.success,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radii.pill,
    gap: 4,
  },
  callBadgeText: {
    color: colors.text.inverse,
    fontSize: 11,
    fontWeight: '700',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: spacing.sm,
    borderRadius: radii.sm,
    gap: 6,
    marginTop: spacing.xs,
  },
  notesText: {
    ...typography.caption,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  confirmedIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmedTextGroup: {
    flex: 1,
  },
  confirmedTitle: {
    ...typography.body,
    fontWeight: '800',
    color: colors.status.success,
  },
  confirmedSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  actionForm: {
    marginTop: spacing.xs,
  },
  formSectionTitle: {
    ...typography.h3,
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.bodySmall,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  confirmButton: {
    marginTop: spacing.xs,
  },

  // Menu Modal (Mock switcher)
  menuOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: spacing.lg,
  },
  menuCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
    ...shadows.floating,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  menuTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '800',
  },
  menuDescription: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  mockOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  mockOptionItemSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(227, 30, 43, 0.04)',
  },
  mockOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  mockOptionTitle: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '700',
  },
  mockOptionTitleSelected: {
    color: colors.primary,
  },
  mockOptionSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 11,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  resetButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
});
