import React, { useEffect } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { playFeedback, useFeedbackStore, type SoundKind } from '@/services/feedback';

const VOLUMES = [0.4, 0.7, 1];

/** Profil → « Sons et vibrations » : réglages propres à ce téléphone. */
export function FeedbackSettingsCard() {
  const { sound, vibration, volume, setSound, setVibration, setVolume, load } = useFeedbackStore();
  useEffect(() => {
    void load();
  }, [load]);

  const tester = (kind: SoundKind) => playFeedback(kind);

  return (
    <View style={styles.card} testID="feedback-settings">
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Ionicons
            name={sound ? 'volume-high-outline' : 'volume-mute-outline'}
            size={20}
            color={colors.primary}
          />
          <Text style={styles.label}>Sons</Text>
        </View>
        <Switch
          value={sound}
          onValueChange={setSound}
          trackColor={{ true: colors.primary, false: colors.border }}
          accessibilityLabel="Activer les sons"
          testID="feedback-sound-switch"
        />
      </View>
      <Text style={styles.hint}>Scan, réussite, refus — même en mode silencieux.</Text>

      <View style={[styles.volumeBlock, !sound && styles.disabled]}>
        <View style={styles.rowLeft}>
          <Ionicons name="options-outline" size={20} color={colors.text.secondary} />
          <Text style={styles.label}>Volume</Text>
        </View>
        <View style={styles.segments}>
          {VOLUMES.map((v, i) => (
            <TouchableOpacity
              key={v}
              disabled={!sound}
              onPress={() => {
                setVolume(v);
                playFeedback('scan');
              }}
              style={[styles.segment, Math.abs(volume - v) < 0.05 && styles.segmentActive]}
              accessibilityLabel={`Volume ${['faible', 'moyen', 'fort'][i]}`}
            >
              <Text
                style={[
                  styles.segmentText,
                  Math.abs(volume - v) < 0.05 && styles.segmentTextActive,
                ]}
              >
                {['Faible', 'Moyen', 'Fort'][i]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Ionicons name="phone-portrait-outline" size={20} color={colors.text.secondary} />
          <Text style={styles.label}>Vibration</Text>
        </View>
        <Switch
          value={vibration}
          onValueChange={setVibration}
          trackColor={{ true: colors.primary, false: colors.border }}
          accessibilityLabel="Activer la vibration"
        />
      </View>

      <View style={styles.tests}>
        {(
          [
            ['scan', 'Scan', 'scan-outline'],
            ['success', 'Succès', 'checkmark-circle-outline'],
            ['error', 'Erreur', 'close-circle-outline'],
          ] as const
        ).map(([kind, label, icon]) => (
          <TouchableOpacity
            key={kind}
            onPress={() => tester(kind)}
            style={styles.testBtn}
            accessibilityLabel={`Tester le son ${label}`}
          >
            <Ionicons name={icon} size={16} color={colors.text.primary} />
            <Text style={styles.testText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexShrink: 1,
    flex: 1,
    minWidth: 0,
  },
  volumeBlock: { paddingVertical: spacing.sm, gap: spacing.sm },
  label: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  hint: { ...typography.caption, color: colors.text.secondary, marginTop: -4, marginBottom: 4 },
  disabled: { opacity: 0.45 },
  segments: { flexDirection: 'row', gap: 6 },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { ...typography.caption, color: colors.text.secondary, fontWeight: '600' },
  segmentTextActive: { color: colors.text.inverse },
  tests: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm, flexWrap: 'wrap' },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background.body,
  },
  testText: { ...typography.caption, color: colors.text.primary, fontWeight: '600' },
});
