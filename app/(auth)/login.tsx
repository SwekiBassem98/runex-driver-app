import React, { useRef, useState } from 'react';
import { feedback } from '@/services/feedback';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, typography, spacing, radii, shadows } from '@/theme';
import { PrimaryButton, ErrorBanner } from '@/components';
import { authService } from '@/services/auth.service';
import { API_BASE_URL, USE_MOCKS } from '@/config/env';
import { ApiError } from '@/types';

/**
 * RUNEX Driver Login Screen
 * Route: /app/(auth)/login.tsx
 */
export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Valeurs pré-remplies seulement en démonstration (données fictives).
  const [identifier, setIdentifier] = useState(USE_MOCKS ? '27949967' : '');
  const [password, setPassword] = useState(USE_MOCKS ? '1234' : '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const [focusedInput, setFocusedInput] = useState<'id' | 'pass' | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      await authService.login({
        identifier: identifier.trim(),
        password: password.trim(),
      });

      feedback.success();
      // Navigate to tabs/home upon success
      router.replace('/home');
    } catch (err: unknown) {
      feedback.error();
      const apiErr = err as ApiError;
      setError(apiErr);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    const title = 'Mot de passe oublié ?';
    const message =
      'Veuillez contacter votre superviseur ou votre agence régionale (Ben Arous) pour réinitialiser vos identifiants de tournée.';

    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message, [{ text: 'Compris', style: 'default' }]);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Full Dark Background with Red-to-Black Primary Gradient */}
      <LinearGradient
        colors={gradients.primaryGradient.colors}
        start={gradients.primaryGradient.start}
        end={gradients.primaryGradient.end}
        style={StyleSheet.absoluteFill}
      />

      {/* « padding » sur les deux plateformes : Android en bord-à-bord ne
          redimensionne plus la fenêtre, le clavier couvrirait les champs. */}
      <KeyboardAvoidingView style={styles.keyboardView} behavior="padding">
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top + spacing.lg, 40),
              paddingBottom: Math.max(insets.bottom + spacing.xl, 32),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          {/* Top RUNEX Logo */}
          <View style={styles.logoSection}>
            <Image
              source={require('../../assets/logo/runex-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View style={styles.driverTagBadge}>
              <View style={styles.driverTagDot} />
              <Text style={styles.driverTagText}>ESPACE LIVREUR</Text>
            </View>
          </View>

          {/* Floating White Rounded Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Connexion</Text>
              <Text style={styles.cardSubtitle}>
                Accédez à votre tournée de livraison et à votre runsheet
              </Text>
            </View>

            {/* Inline Error Banner if Rejected (e.g. "0000") */}
            {error && (
              <ErrorBanner
                type="permission"
                code={error.code || `${error.status}`}
                title="Erreur d'authentification"
                message={error.message}
                onDismiss={() => setError(null)}
                style={styles.errorBanner}
              />
            )}

            {/* Input 1: Phone number or matricule */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Téléphone ou Matricule</Text>
              <View
                style={[
                  styles.inputContainer,
                  focusedInput === 'id' && styles.inputContainerFocused,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={focusedInput === 'id' ? colors.primary : colors.text.secondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Téléphone, matricule ou email"
                  placeholderTextColor={colors.text.muted}
                  value={identifier}
                  onChangeText={(val) => {
                    setIdentifier(val);
                    if (error) setError(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  keyboardType="email-address"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  testID="login-identifier"
                  onFocus={() => setFocusedInput('id')}
                  onBlur={() => setFocusedInput(null)}
                  editable={!loading}
                />
                {identifier.length > 0 && !loading && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setIdentifier('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.text.muted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Input 2: Password with show/hide toggle */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mot de passe</Text>
              <View
                style={[
                  styles.inputContainer,
                  focusedInput === 'pass' && styles.inputContainerFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={focusedInput === 'pass' ? colors.primary : colors.text.secondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={styles.textInput}
                  placeholder="••••••••"
                  placeholderTextColor={colors.text.muted}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (error) setError(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  textContentType="password"
                  testID="login-password"
                  onFocus={() => setFocusedInput('pass')}
                  onBlur={() => setFocusedInput(null)}
                  editable={!loading}
                  onSubmitEditing={handleLogin}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary Action Button: "Se connecter" */}
            <PrimaryButton
              title="Se connecter"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
              style={styles.submitBtn}
            />

            {/* "Mot de passe oublié ?" text link, muted */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleForgotPassword}
              style={styles.forgotBtn}
            >
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            {USE_MOCKS ? (
              <View style={styles.testHintBox}>
                <Text style={styles.testHintText}>
                  💡 <Text style={styles.testHintBold}>Test démo :</Text> n&apos;importe quel
                  identifiant se connecte. Tapez <Text style={styles.testHintCode}>0000</Text> pour
                  simuler une erreur 401.
                </Text>
              </View>
            ) : __DEV__ ? (
              <Text style={styles.apiHint} selectable>
                Serveur : {API_BASE_URL}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.header,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoImage: {
    width: 220,
    height: 110,
  },
  driverTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  driverTagDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    marginRight: 6,
  },
  driverTagText: {
    ...typography.caption,
    color: colors.text.inverse,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontSize: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    ...shadows.floating,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardHeader: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.h1,
    color: colors.text.primary,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: 4,
  },
  errorBanner: {
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xs + 2,
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
  inputContainerFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  apiHint: {
    ...typography.caption,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  submitBtn: {
    marginTop: spacing.xs,
    borderRadius: radii.button,
  },
  forgotBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: 2,
  },
  forgotText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  testHintBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  testHintText: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 16,
    fontSize: 11,
  },
  testHintBold: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  testHintCode: {
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 3,
    borderRadius: 3,
  },
});
