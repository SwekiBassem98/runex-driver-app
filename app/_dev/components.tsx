import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, typography, spacing, radii, shadows } from '@/theme';
import {
  Screen,
  StatCard,
  Pill,
  SegmentedTabs,
  EmptyState,
  BottomNav,
  BottomNavTab,
  Badge,
  ErrorBanner,
  PrimaryButton,
  SecondaryButton,
  IconButton,
} from '@/components';

/**
 * RUNEX Component Gallery & Design System Review
 * Route: /app/_dev/components.tsx
 */
export default function ComponentGalleryScreen() {
  // Interactive state hooks for visual testing
  const [activeTab, setActiveTab] = useState<BottomNavTab>('runsheet');
  const [activePickupFilter, setActivePickupFilter] = useState('en_cours');
  const [activeRunsheetFilter, setActiveRunsheetFilter] = useState('en_livraison');
  const [btnLoading, setBtnLoading] = useState(false);
  const [show403Banner, setShow403Banner] = useState(true);
  const [showNetworkBanner, setShowNetworkBanner] = useState(true);

  const pickupTabs = [
    { id: 'tous', label: 'Tous', count: 12 },
    { id: 'en_cours', label: 'En cours', count: 4 },
    { id: 'effectues', label: 'Effectués', count: 8 },
  ];

  const runsheetTabs = [
    { id: 'tous', label: 'Tous', count: 48 },
    { id: 'en_livraison', label: 'En livraison', count: 18 },
    { id: 'livres', label: 'Livrés', count: 24 },
    { id: 'reportes', label: 'Reportés', count: 3 },
  ];

  return (
    <Screen
      title="Design System"
      subtitle="RUNEX Driver App • Component Gallery"
      scrollable
      headerRight={
        <View style={styles.headerRightBadge}>
          <Text style={styles.headerRightText}>v1.0.0</Text>
        </View>
      }
      bottomNav={
        <BottomNav
          activeTab={activeTab}
          onTabPress={(tab) => setActiveTab(tab)}
          badges={{ runsheet: 18, pickup: 4 }}
        />
      }
    >
      {/* 1. BRAND HERO & GRADIENT SHOWCASE */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCategory}>01. IDENTITÉ DE MARQUE</Text>
          <Text style={styles.sectionTitle}>Brand Identity & Logo Gradient</Text>
        </View>

        {/* Diagonal red-to-black gradient matching the logo's "R" */}
        <LinearGradient
          colors={gradients.primaryGradient.colors}
          start={gradients.primaryGradient.start}
          end={gradients.primaryGradient.end}
          style={styles.heroGradientCard}
        >
          <View style={styles.heroContent}>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoBadgeText}>R</Text>
              </View>
              <View>
                <Text style={styles.brandWordmark}>RUNEX</Text>
                <Text style={styles.brandTagline}>LOGISTICS & DELIVERY DRIVER</Text>
              </View>
            </View>

            <View style={styles.heroSpecs}>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>TONE</Text>
                <Text style={styles.specValue}>Fast • Sporty • Pro</Text>
              </View>
              <View style={styles.specDivider} />
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>THEME</Text>
                <Text style={styles.specValue}>Two-Tone Dark/Light</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* 2. COLOR PALETTE */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCategory}>02. DESIGN TOKENS</Text>
          <Text style={styles.sectionTitle}>Palette Couleurs</Text>
        </View>

        <Text style={styles.groupSubtitle}>Brand & Structure</Text>
        <View style={styles.paletteGrid}>
          <ColorSwatch
            name="Primary Red"
            hex={colors.primary}
            desc="Actions & Active state"
            textColor="#FFFFFF"
          />
          <ColorSwatch
            name="Header Navy"
            hex={colors.background.header}
            desc="Dark header & Nav"
            textColor="#FFFFFF"
          />
          <ColorSwatch
            name="Body Neutral"
            hex={colors.background.body}
            desc="Screen body bg"
            textColor="#111827"
            bordered
          />
          <ColorSwatch
            name="Surface White"
            hex={colors.surface}
            desc="Card background"
            textColor="#111827"
            bordered
          />
        </View>

        <Text style={[styles.groupSubtitle, { marginTop: spacing.md }]}>
          Status Couleurs (Livraison)
        </Text>
        <View style={styles.paletteGrid}>
          <ColorSwatch
            name="Delivered / Livré"
            hex={colors.status.success}
            desc="Success #16A34A"
            textColor="#FFFFFF"
          />
          <ColorSwatch
            name="In Transit / En cours"
            hex={colors.status.info}
            desc="Info #2563EB"
            textColor="#FFFFFF"
          />
          <ColorSwatch
            name="Reporté / Postponed"
            hex={colors.status.warning}
            desc="Warning #F59E0B"
            textColor="#FFFFFF"
          />
          <ColorSwatch
            name="Retour / 403 Danger"
            hex={colors.status.danger}
            desc="Danger #DC2626"
            textColor="#FFFFFF"
          />
        </View>
      </View>

      {/* 3. TYPOGRAPHY SCALE */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCategory}>03. ÉCHELLE TYPOGRAPHIQUE</Text>
          <Text style={styles.sectionTitle}>Typography Scale</Text>
        </View>

        <View style={styles.typoCard}>
          <View style={styles.typoRow}>
            <Text style={styles.typoMeta}>display (36px, heavy)</Text>
            <Text style={[typography.display, { color: colors.text.primary }]}>RUNEX 48</Text>
          </View>
          <View style={styles.typoDivider} />

          <View style={styles.typoRow}>
            <Text style={styles.typoMeta}>h1 (28px, bold)</Text>
            <Text style={[typography.h1, { color: colors.text.primary }]}>Runsheet du jour</Text>
          </View>
          <View style={styles.typoDivider} />

          <View style={styles.typoRow}>
            <Text style={styles.typoMeta}>h2 (22px, bold)</Text>
            <Text style={[typography.h2, { color: colors.text.primary }]}>
              Bonjour HAMZA MABROUK
            </Text>
          </View>
          <View style={styles.typoDivider} />

          <View style={styles.typoRow}>
            <Text style={styles.typoMeta}>h3 (18px, semi-bold)</Text>
            <Text style={[typography.h3, { color: colors.text.primary }]}>
              Détails du colis #RNX-8921
            </Text>
          </View>
          <View style={styles.typoDivider} />

          <View style={styles.typoRow}>
            <Text style={styles.typoMeta}>statNumber (34px, heavy)</Text>
            <Text style={[typography.statNumber, { color: colors.primary }]}>1,420 TND</Text>
          </View>
          <View style={styles.typoDivider} />

          <View style={styles.typoRow}>
            <Text style={styles.typoMeta}>body & bodySmall (Inter 16px / 14px)</Text>
            <Text style={[typography.body, { color: colors.text.primary }]}>
              Livraison prévue au Centre Urbain Nord, Tunis.
            </Text>
            <Text style={[typography.bodySmall, { color: colors.text.secondary, marginTop: 4 }]}>
              Client contacté par téléphone • Paiement en espèces à la livraison.
            </Text>
          </View>
        </View>
      </View>

      {/* 4. STAT CARD GRID (DASHBOARD) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCategory}>04. COMPOSANT STATCARD</Text>
          <Text style={styles.sectionTitle}>Dashboard Grid (6 Compteurs)</Text>
        </View>

        <View style={styles.statGrid}>
          <View style={styles.statCol}>
            <StatCard label="Total colis" value={48} variant="total" onPress={() => {}} />
          </View>
          <View style={styles.statCol}>
            <StatCard label="En livraison" value={18} variant="inDelivery" onPress={() => {}} />
          </View>
          <View style={styles.statCol}>
            <StatCard label="Livrés" value={24} variant="delivered" onPress={() => {}} />
          </View>
          <View style={styles.statCol}>
            <StatCard label="Reportés" value={3} variant="postponed" onPress={() => {}} />
          </View>
          <View style={styles.statCol}>
            <StatCard label="Retours" value={2} variant="returned" onPress={() => {}} />
          </View>
          <View style={styles.statCol}>
            <StatCard label="Relances" value={1} variant="relanced" onPress={() => {}} />
          </View>
        </View>
      </View>

      {/* 5. PILLS & SEGMENTED TABS */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCategory}>05. FILTRES & ONGLETS</Text>
          <Text style={styles.sectionTitle}>SegmentedTabs & Pill</Text>
        </View>

        <Text style={styles.groupSubtitle}>Filtres Pickups (Tous / En cours / Effectués)</Text>
        <SegmentedTabs
          tabs={pickupTabs}
          activeTab={activePickupFilter}
          onTabChange={(id) => setActivePickupFilter(id)}
          variant="dark"
        />

        <Text style={[styles.groupSubtitle, { marginTop: spacing.lg }]}>
          Filtres Runsheet (Tous / En livraison / Livrés / Reportés)
        </Text>
        <SegmentedTabs
          tabs={runsheetTabs}
          activeTab={activeRunsheetFilter}
          onTabChange={(id) => setActiveRunsheetFilter(id)}
          variant="dark"
        />

        <Text style={[styles.groupSubtitle, { marginTop: spacing.lg }]}>
          Variantes Individuelles Pill
        </Text>
        <View style={styles.pillsRow}>
          <Pill label="Dark Active" active variant="dark" />
          <Pill label="Primary Red" active variant="primary" />
          <Pill label="Inactif (12)" active={false} />
        </View>
      </View>

      {/* 6. STATUS BADGES */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCategory}>06. CHIPS DE STATUT</Text>
          <Text style={styles.sectionTitle}>Badges de Statut</Text>
        </View>

        <View style={styles.badgesWrapper}>
          <View style={styles.badgeRow}>
            <Badge label="Livré" status="delivered" dot size="md" />
            <Badge label="En livraison" status="inDelivery" dot size="md" />
            <Badge label="Reporté" status="postponed" dot size="md" />
          </View>
          <View style={[styles.badgeRow, { marginTop: spacing.sm }]}>
            <Badge label="Retour" status="returned" dot size="md" />
            <Badge label="Relancé" status="relanced" dot size="md" />
            <Badge label="Solid Red" status="danger" variant="solid" size="md" />
          </View>
        </View>
      </View>

      {/* 7. ERROR BANNER (403 PERMISSION & NETWORK) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCategory}>{'07. GESTION DES ERREURS & 403'}</Text>
          <Text style={styles.sectionTitle}>ErrorBanner (403 & Network)</Text>
        </View>

        {show403Banner && (
          <ErrorBanner
            type="permission"
            code="403"
            title="Action non autorisée"
            message="Vous n'avez pas l'autorisation de clôturer ce colis. Contactez le superviseur de l'agence Ben Arous."
            onDismiss={() => setShow403Banner(false)}
          />
        )}

        {showNetworkBanner && (
          <ErrorBanner
            type="network"
            code="OFFLINE"
            title="Connexion réseau perdue"
            message="Impossible de synchroniser les données avec le serveur. Les scans sont sauvegardés localement."
            onRetry={() => {
              alert('Synchronisation locale en cours...');
            }}
            onDismiss={() => setShowNetworkBanner(false)}
            actionLabel="Synchroniser"
          />
        )}

        <ErrorBanner
          type="warning"
          title="Validation requise"
          message="Le montant de 120.000 TND doit être encaissé avant de marquer le colis comme livré."
        />
      </View>

      {/* 8. BUTTONS & ACTIONS */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCategory}>08. BOUTONS & ACTIONS</Text>
          <Text style={styles.sectionTitle}>Buttons (Primary, Secondary, Icon)</Text>
        </View>

        <View style={styles.buttonStack}>
          <PrimaryButton
            title="Scanner le code-barres"
            iconName="scan-outline"
            onPress={() => {}}
          />

          <PrimaryButton
            title={btnLoading ? 'Chargement...' : 'Confirmer la livraison'}
            loading={btnLoading}
            onPress={() => {
              setBtnLoading(true);
              setTimeout(() => setBtnLoading(false), 2000);
            }}
          />

          <SecondaryButton
            title="Saisie manuelle du colis"
            iconName="keypad-outline"
            variant="outline"
            onPress={() => {}}
          />

          <SecondaryButton
            title="Retour au dépôt"
            iconName="arrow-undo-outline"
            variant="dark"
            onPress={() => {}}
          />

          <Text style={[styles.groupSubtitle, { marginTop: spacing.md }]}>IconButtons</Text>
          <View style={styles.iconButtonsRow}>
            <IconButton iconName="flash-outline" onPress={() => {}} variant="surface" />
            <IconButton iconName="camera-reverse-outline" onPress={() => {}} variant="surface" />
            <IconButton iconName="call-outline" onPress={() => {}} variant="primary" />
            <IconButton iconName="navigate-outline" onPress={() => {}} variant="dark" />
            <IconButton iconName="ellipsis-horizontal" onPress={() => {}} variant="ghost" />
          </View>
        </View>
      </View>

      {/* 9. EMPTY STATES */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionCategory}>09. ÉTATS VIDES</Text>
          <Text style={styles.sectionTitle}>EmptyState Component</Text>
        </View>

        <View style={styles.emptyStateCard}>
          <EmptyState
            title="Aucun pickup prévu"
            description="Tous les ramassages de votre tournée ont été traités."
            action={
              <SecondaryButton
                title="Actualiser la liste"
                iconName="refresh"
                size="sm"
                fullWidth={false}
                onPress={() => {}}
              />
            }
          />
        </View>
      </View>
    </Screen>
  );
}

/**
 * Color Swatch Card Subcomponent
 */
function ColorSwatch({
  name,
  hex,
  desc,
  textColor = '#FFFFFF',
  bordered = false,
}: {
  name: string;
  hex: string;
  desc: string;
  textColor?: string;
  bordered?: boolean;
}) {
  return (
    <View style={styles.swatchCard}>
      <View
        style={[styles.swatchColorBox, { backgroundColor: hex }, bordered && styles.swatchBordered]}
      >
        <Text style={[styles.swatchHex, { color: textColor }]}>{hex}</Text>
      </View>
      <View style={styles.swatchDetails}>
        <Text style={styles.swatchName}>{name}</Text>
        <Text style={styles.swatchDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xxxl,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionCategory: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginTop: 2,
  },
  groupSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  headerRightBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  headerRightText: {
    ...typography.caption,
    color: colors.text.inverse,
    fontWeight: '700',
  },
  heroGradientCard: {
    borderRadius: radii.card,
    padding: spacing.xl,
    overflow: 'hidden',
    ...shadows.floating,
  },
  heroContent: {
    zIndex: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoBadgeText: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  brandWordmark: {
    ...typography.display,
    color: colors.text.inverse,
    fontWeight: '900',
    letterSpacing: 2,
    fontStyle: 'italic',
  },
  brandTagline: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  heroSpecs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  specItem: {
    flex: 1,
  },
  specDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: spacing.md,
  },
  specLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
  },
  specValue: {
    ...typography.caption,
    color: colors.text.inverse,
    fontWeight: '600',
    marginTop: 2,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  swatchCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  swatchColorBox: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  swatchBordered: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  swatchHex: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  swatchDetails: {
    paddingHorizontal: 2,
  },
  swatchName: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.primary,
  },
  swatchDesc: {
    fontSize: 11,
    color: colors.text.muted,
  },
  typoCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  typoRow: {
    paddingVertical: spacing.xs,
  },
  typoDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
  },
  typoMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  statCol: {
    width: '50%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  badgesWrapper: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  buttonStack: {
    gap: spacing.sm,
  },
  iconButtonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  emptyStateCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
});
