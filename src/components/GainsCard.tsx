import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { driversService } from '@/services/drivers.service';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { DriverGains, formatTND } from '@/types';

/**
 * Gains du livreur : un tarif fixe (3 DT) par colis livré ou ramassage
 * effectué. Montre aujourd'hui, le mois, et ce que la société lui doit
 * encore (gagné − déjà payé). Discret si l'API ne répond pas.
 */
export function GainsCard() {
  const [gains, setGains] = useState<DriverGains | null>(null);

  const charger = useCallback(async () => {
    try {
      setGains(await driversService.getGains());
    } catch {
      // Carte secondaire : son absence ne bloque pas l'accueil.
    }
  }, []);

  useEffect(() => {
    let actif = true;
    driversService
      .getGains()
      .then((g) => {
        if (actif) setGains(g);
      })
      .catch(() => undefined);
    return () => {
      actif = false;
    };
  }, []);
  useRefreshOnFocus(charger);

  if (!gains) return null;

  return (
    <View style={styles.card} testID="gains-card">
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Ionicons name="wallet-outline" size={20} color={colors.cash.green} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Mes gains</Text>
          <Text style={styles.subtitle}>{formatTND(gains.tarif)} par colis livré ou ramassage</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.cell}>
          <Text style={styles.value} testID="gains-aujourdhui">
            {formatTND(gains.aujourdhui.gain)}
          </Text>
          <Text style={styles.label}>
            Aujourd&apos;hui · {gains.aujourdhui.livres} livr. / {gains.aujourdhui.ramassages} ram.
          </Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.value}>{formatTND(gains.ceMois.gain)}</Text>
          <Text style={styles.label}>Ce mois</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Reste à vous payer</Text>
        <Text style={styles.footerValue} testID="gains-reste">
          {formatTND(gains.resteAPayer)}
        </Text>
      </View>
      {gains.dernierPaiement && (
        <Text style={styles.lastPaid}>
          Dernier paiement le {new Date(gains.dernierPaiement).toLocaleDateString('fr-TN')} · déjà
          payé {formatTND(gains.totalPaye)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.sm },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: { ...typography.h3, color: colors.text.primary },
  subtitle: { fontSize: 12, color: colors.text.secondary },
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: radii.md, padding: spacing.sm },
  value: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  label: { fontSize: 11, color: colors.text.secondary, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerLabel: { fontSize: 13, color: colors.text.secondary },
  footerValue: { fontSize: 18, fontWeight: '800', color: colors.cash.green },
  lastPaid: { fontSize: 11, color: colors.text.secondary, marginTop: 6 },
});
