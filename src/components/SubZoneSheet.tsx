import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, shadows, spacing, typography } from '@/theme';

export interface SubZoneSheetProps {
  visible: boolean;
  /** Nombre de colis concernés (affiché dans le titre). */
  count: number;
  /** Sous-zone actuelle (un seul colis, ou tous les colis choisis dans la même). */
  current?: string | null;
  /** Sous-zones déjà utilisées dans la tournée : un appui les reprend. */
  existing: { nom: string; count: number }[];
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  /** null : retirer la sous-zone. */
  onSave: (subZone: string | null) => void;
}

/**
 * Fenêtre « Sous-zone » : le livreur nomme (ou reprend) une sous-zone pour les
 * colis choisis, ou la retire. Les colis rangés dans une sous-zone passent en
 * tête de la liste et la sous-zone apparaît dans le filtre « Zones ».
 */
export const SubZoneSheet: React.FC<SubZoneSheetProps> = ({
  visible,
  count,
  current,
  existing,
  saving = false,
  error,
  onClose,
  onSave,
}) => {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(current ?? '');
  const propre = value.replace(/\s+/g, ' ').trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      // À chaque ouverture : la sous-zone actuelle du (des) colis.
      onShow={() => setValue(current ?? '')}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + spacing.lg, 24) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Sous-zone</Text>
              <Text style={styles.subtitle}>
                {count > 1 ? `${count} colis choisis` : '1 colis'} · ils passeront en tête de la liste
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Fermer">
              <Ionicons name="close" size={22} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <TextInput
            testID="sous-zone-saisie"
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder="Ex. : Centre-ville, Rue de Marseille…"
            placeholderTextColor={colors.text.muted}
            maxLength={60}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => propre && onSave(propre)}
          />

          {existing.length > 0 && (
            <>
              <Text style={styles.label}>Mes sous-zones</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {existing.map((s) => {
                  const choisie = s.nom.toLowerCase() === propre.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={s.nom}
                      onPress={() => setValue(s.nom)}
                      style={[styles.chip, choisie && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, choisie && styles.chipTextSelected]}>
                        {s.nom} · {s.count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            {!!current && (
              <TouchableOpacity
                testID="sous-zone-retirer"
                disabled={saving}
                onPress={() => onSave(null)}
                style={[styles.btn, styles.btnGhost]}
              >
                <Text style={styles.btnGhostText}>Retirer</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              testID="sous-zone-enregistrer"
              disabled={saving || !propre}
              onPress={() => onSave(propre)}
              style={[styles.btn, styles.btnPrimary, (saving || !propre) && { opacity: 0.5 }]}
            >
              {saving ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <Text style={styles.btnPrimaryText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    ...shadows.floating,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  title: { ...typography.h2, fontSize: 20, color: colors.text.primary, fontWeight: '800' },
  subtitle: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  closeBtn: { padding: 4 },
  input: {
    ...typography.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    height: 48,
    backgroundColor: colors.surface,
  },
  label: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  chips: { gap: spacing.sm, paddingVertical: 2 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F9FAFB',
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: 'rgba(227, 30, 43, 0.06)' },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  chipTextSelected: { color: colors.primary },
  error: { ...typography.caption, color: colors.status.danger, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  btn: { flex: 1, height: 48, borderRadius: radii.button, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: colors.text.inverse, fontWeight: '800', fontSize: 15 },
  btnGhost: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  btnGhostText: { color: colors.text.primary, fontWeight: '700', fontSize: 15 },
});
