import { useEffect } from 'react';
import { prepareFeedback } from '@/services/feedback';
import { registerForPush, startPushListeners } from '@/services/push';
import { ActivityIndicator, Text, View } from 'react-native';
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
export default function RootLayout() {
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

  // APK mal configuré (adresse du serveur absente ou non sécurisée) : on
  // l'annonce clairement plutôt que de laisser échouer chaque connexion.
  // Livreur connecté : notifications poussées (jeton envoyé à l'API à chaque
  // connexion et à chaque démarrage) et écoutes globales.
  useEffect(() => {
    if (!isAuthenticated) return;
    void registerForPush();
    return startPushListeners();
  }, [isAuthenticated]);

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

  if (!hydrated || (!fontsLoaded && !fontError)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A0A0A',
        }}
      >
        <StatusBar style="light" />
        <ActivityIndicator color="#E31E2B" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="runsheet/[id]" />
          <Stack.Screen name="profile/zones" />
        </Stack.Protected>
        {/* Galerie de composants : absente des builds de production. */}
        <Stack.Protected guard={__DEV__}>
          <Stack.Screen name="_dev/components" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
