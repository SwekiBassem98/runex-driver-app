import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii, shadows } from '@/theme';
import { PrimaryButton } from '@/components';
import { authService } from '@/services/auth.service';
import { normalizeError } from '@/services/api-client';
import { feedback } from '@/services/feedback';

const MIN_LENGTH = 8;

/** 0 à 3 : vide, faible, moyen, solide (même règle que le site web). */
function strength(value: string): 0 | 1 | 2 | 3 {
  if (!value) return 0;
  let score = 0;
  if (value.length >= MIN_LENGTH) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  if (value.length < MIN_LENGTH || score <= 2) return 1;
  return score === 3 ? 2 : 3;
}

const STRENGTH_LABEL = ['', 'Faible', 'Moyen', 'Solide'];
const STRENGTH_COLOR = [colors.border, '#DC2626', '#D97706', '#059669'];

/**
 * Changement du mot de passe du livreur connecté
 * Route: /app/profile/password.tsx
 *
 * `POST /auth/change-password` : le mot de passe actuel est exigé. Les autres
 * appareils connectés au compte sont déconnectés ; ce téléphone reste connecté.
 */
export default function ChangePasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const nextRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const level = strength(next);
  const edit = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setError(null);
  };

  const submit = async () => {
    if (loading) return;
    setError(null);
    setSuccess(null);
    if (!current) return setError('Saisissez votre mot de passe actuel.');
    if (next.length < MIN_LENGTH)
      return setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
    if (next !== confirm) return setError('Les deux mots de passe ne correspondent pas.');
    if (next === current)
      return setError('Le nouveau mot de passe doit être différent de l’actuel.');
    setLoading(true);
    try {
      const closed = await authService.changePassword(current, next);
      feedback.success();
      setCurrent('');
      setNext('');
      setConfirm('');
      setSuccess(
        closed > 0
          ? `Mot de passe modifié. ${closed} autre(s) appareil(s) déconnecté(s).`
          : 'Mot de passe modifié.'
      );
    } catch (err) {
      feedback.error();
      const e = normalizeError(err);
      setError(
        e.status === 429
          ? 'Trop de tentatives. Patientez quelques minutes puis réessayez.'
          : e.message || 'Le changement a échoué. Réessayez.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top + spacing.xs, 16) }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="Retour"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.inverse} />
          </TouchableOpacity>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>Mot de passe</Text>
            <Text style={styles.headerSubtitle}>Changer le mot de passe de connexion</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom + spacing.xl, 32) },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.help}>
              Saisissez votre mot de passe actuel puis le nouveau (8 caractères au moins). Vos
              autres appareils seront déconnectés ; ce téléphone reste connecté.
            </Text>

            <PasswordField
              label="Mot de passe actuel"
              value={current}
              onChange={edit(setCurrent)}
              testID="pwd-current"
              visible={visible}
              editable={!loading}
              onSubmit={() => nextRef.current?.focus()}
            />
            <PasswordField
              label="Nouveau mot de passe"
              value={next}
              onChange={edit(setNext)}
              testID="pwd-new"
              visible={visible}
              editable={!loading}
              inputRef={nextRef}
              isNew
              onSubmit={() => confirmRef.current?.focus()}
            />
            {next.length > 0 && (
              <View style={styles.meterRow}>
                {[1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.meterBar,
                      { backgroundColor: i <= level ? STRENGTH_COLOR[level] : colors.border },
                    ]}
                  />
                ))}
                <Text style={styles.meterText}>{STRENGTH_LABEL[level]}</Text>
              </View>
            )}
            <PasswordField
              label="Confirmer le nouveau mot de passe"
              value={confirm}
              onChange={edit(setConfirm)}
              testID="pwd-confirm"
              visible={visible}
              editable={!loading}
              inputRef={confirmRef}
              isNew
              last
              onSubmit={() => void submit()}
            />

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setVisible((v) => !v)}
              style={styles.toggleRow}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={visible ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.text.secondary}
              />
              <Text style={styles.toggleText}>
                {visible ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
              </Text>
            </TouchableOpacity>

            {error && (
              <View style={styles.errorBox} accessibilityRole="alert">
                <Ionicons name="alert-circle" size={18} color={colors.primary} />
                <Text style={styles.errorText} testID="pwd-error">
                  {error}
                </Text>
              </View>
            )}
            {success && (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
                <Text style={styles.successText} testID="pwd-success">
                  {success}
                </Text>
              </View>
            )}

            <PrimaryButton
              title="Enregistrer le mot de passe"
              onPress={() => void submit()}
              loading={loading}
              fullWidth
              size="lg"
              style={{ marginTop: spacing.md }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  testID,
  visible,
  editable,
  inputRef,
  onSubmit,
  isNew = false,
  last = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testID: string;
  visible: boolean;
  editable: boolean;
  inputRef?: React.RefObject<TextInput | null>;
  onSubmit?: () => void;
  isNew?: boolean;
  last?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputContainer}>
        <Ionicons
          name="lock-closed-outline"
          size={18}
          color={colors.text.secondary}
          style={styles.inputIcon}
        />
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={isNew ? 'new-password' : 'current-password'}
          textContentType={isNew ? 'newPassword' : 'password'}
          returnKeyType={last ? 'done' : 'next'}
          submitBehavior={last ? 'blurAndSubmit' : 'submit'}
          onSubmitEditing={onSubmit}
          editable={editable}
          maxLength={128}
          testID={testID}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.body },
  headerContainer: {
    backgroundColor: colors.background.header,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    ...shadows.header,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleGroup: { flex: 1 },
  headerTitle: { ...typography.h2, fontSize: 20, color: colors.text.inverse, fontWeight: '800' },
  headerSubtitle: { ...typography.caption, color: 'rgba(255, 255, 255, 0.7)', marginTop: 2 },
  content: { padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
    ...shadows.card,
  },
  help: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 19,
  },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: radii.button,
    borderWidth: 1.2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  inputIcon: { marginRight: spacing.sm },
  textInput: { flex: 1, ...typography.body, color: colors.text.primary, paddingVertical: 0 },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
    marginBottom: spacing.md,
  },
  meterBar: { flex: 1, height: 5, borderRadius: 3 },
  meterText: { ...typography.caption, color: colors.text.secondary, width: 52, textAlign: 'right' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  toggleText: { ...typography.bodySmall, color: colors.text.secondary, fontWeight: '600' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  errorText: { flex: 1, ...typography.bodySmall, color: '#B91C1C' },
  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  successText: { flex: 1, ...typography.bodySmall, color: '#047857' },
});
