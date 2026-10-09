import { useCallback, useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { BrandSplash, SPLASH_BACKGROUND } from '@/components/BrandSplash';
import { prepareFeedback } from '@/services/feedback';
import { registerForPush, startPushListeners } from '@/services/push';
import { Platform, Text, View } from 'react-native';
import { API_CONFIG_ERROR } from '@/config/env';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useAuthStore } from '@/store/auth.store';

/**
 * Racine de l'application.
 *
 * - Polices chargées avant le premier écran (sinon iOS signale une police
 *   inconnue et Android affiche la police système).
 * - Session relue depuis le trousseau du téléphone.
 * - Accès par garde déclarative (Stack.Protected) : sans session, seules les
 *   routes de connexion existent ; avec session, seules les routes du livreur.
 *   Aucune redirection impérative : une redirection rejouée pendant la saisie
 *   détache l'écran et fait perdre le focus au champ (clavier qui se ferme).
 */
// L'écran natif (fond anthracite, « R ») reste affiché jusqu'à ce que
// l'ouverture animée soit montée : aucun écran blanc entre les deux.
if (Platform.OS !== 'web') {
  void SplashScreen.preventAutoHideAsync().catch(() => undefined);
  SplashScreen.setOptions({ duration: 250, fade: true });
}

export default function RootLayout() {
  // Ouverture animée sur téléphone ; le build web (tests) s'en passe, sauf
  // EXPO_PUBLIC_WEB_SPLASH=true pour la prévisualiser dans un navigateur.
  const [splashVisible, setSplashVisible] = useState(
    Platform.OS !== 'web' || process.env.EXPO_PUBLIC_WEB_SPLASH === 'true'
  );
  const hideSplash = useCallback(() => setSplashVisible(false), []);
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [fontsLoaded, fontError] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    void useAuthStore.getState().hydrate();
    // Sons préchargés dès le démarrage : premier scan sans latence.
    void prepareFeedback();
  }, []);

  // Livreur connecté : notifications poussées (jeton envoyé à l'API à chaque
  // connexion et à chaque démarrage) et écoutes globales.
  useEffect(() => {
    if (!isAuthenticated) return;
    void registerForPush();
    return startPushListeners();
  }, [isAuthenticated]);

  // APK mal configuré (adresse du serveur absente ou non sécurisée) : on
  // l'annonce clairement plutôt que de laisser échouer chaque connexion.
  useEffect(() => {
    if (API_CONFIG_ERROR) void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  if (API_CONFIG_ERROR) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          backgroundColor: '#0A0A0A',
        }}
      >
        <StatusBar style="light" />
        <Text
          accessibilityRole="alert"
          style={{ color: '#FFFFFF', fontSize: 16, lineHeight: 24, textAlign: 'center' }}
        >
          {API_CONFIG_ERROR}
        </Text>
      </View>
    );
  }

  const ready = hydrated && (fontsLoaded || !!fontError);

  return (
    <View style={{ flex: 1, backgroundColor: SPLASH_BACKGROUND }}>
      <StatusBar style="light" />
      {ready && (
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" />
          <Stack.Protected guard={!isAuthenticated}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          <Stack.Protected guard={isAuthenticated}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="runsheet/[id]" />
            <Stack.Screen name="profile/zones" />
            <Stack.Screen name="profile/password" />
          </Stack.Protected>
          {/* Galerie de composants : absente des builds de production. */}
          <Stack.Protected guard={__DEV__}>
            <Stack.Screen name="_dev/components" />
          </Stack.Protected>
        </Stack>
      )}
      {splashVisible && <BrandSplash ready={ready} onFinish={hideSplash} />}
    </View>
  );
}
