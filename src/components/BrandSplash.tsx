import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';

/**
 * Ouverture animée de RUNEX Driver.
 *
 * Prend le relais de l'écran de démarrage natif (même fond, même « R » au
 * centre) puis joue la séquence :
 *   1. trois traînées rouges traversent l'écran et deviennent les lignes de
 *      vitesse du « R » ;
 *   2. le « R » s'installe (léger dépassement, ressort) sur un halo rouge ;
 *   3. « RUNEX » apparaît, un reflet balaie le logo ;
 *   4. « ESPACE LIVREUR » et son trait rouge ;
 *   5. tant que l'application charge (session, polices), le halo respire et
 *      la barre de chargement défile ; dès qu'elle est prête, l'ouverture
 *      s'efface en s'agrandissant légèrement sur l'écran de connexion.
 *
 * Animations natives (`useNativeDriver`) : fluides même pendant le chargement
 * JavaScript. « Réduire les animations » du téléphone : simple fondu.
 */

export const SPLASH_BACKGROUND = '#0E0F12';
const RED = '#E31E2B';

const MARK = require('../../assets/brand/splash-mark.png');
const WORDMARK = require('../../assets/brand/wordmark.png');
const GLOW = require('../../assets/brand/glow.png');

const MARK_W = 172;
const MARK_H = Math.round((MARK_W * 428) / 600);
const WORD_W = 228;
const WORD_H = Math.round((WORD_W * 201) / 800);
/** Durée minimale de la séquence avant de pouvoir s'effacer. */
const INTRO_MS = 1750;

interface Props {
  /** Session relue et polices chargées : l'écran suivant peut s'afficher. */
  ready: boolean;
  onFinish: () => void;
}

export function BrandSplash({ ready, onFinish }: Props) {
  const { width } = useWindowDimensions();
  const [introDone, setIntroDone] = useState(false);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const finished = useRef(false);

  const [leaving, setLeaving] = useState(false);
  // Valeurs animées créées une fois (état initial paresseux, jamais remplacé).
  const [v] = useState(() => ({
    streak: [0, 1, 2].map(() => new Animated.Value(0)),
    mark: new Animated.Value(0),
    glow: new Animated.Value(0),
    word: new Animated.Value(0),
    shine: new Animated.Value(0),
    tagline: new Animated.Value(0),
    loader: new Animated.Value(0),
    exit: new Animated.Value(0),
  }));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
  }, []);

  // Séquence d'entrée.
  useEffect(() => {
    if (reduceMotion === null) return;
    const ease = Easing.out(Easing.cubic);
    const timing = (val: Animated.Value, toValue: number, duration: number, delay = 0) =>
      Animated.timing(val, { toValue, duration, delay, easing: ease, useNativeDriver: true });

    if (reduceMotion) {
      Animated.parallel([
        timing(v.mark, 1, 250),
        timing(v.word, 1, 250),
        timing(v.tagline, 1, 250),
        timing(v.glow, 0.5, 250),
      ]).start(() => setIntroDone(true));
      return;
    }

    Animated.parallel([
      Animated.stagger(
        70,
        v.streak.map((s) =>
          Animated.timing(s, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true,
          })
        )
      ),
      Animated.spring(v.mark, {
        toValue: 1,
        delay: 260,
        friction: 6,
        tension: 70,
        useNativeDriver: true,
      }),
      timing(v.glow, 1, 700, 300),
      timing(v.word, 1, 520, 700),
      Animated.timing(v.shine, {
        toValue: 1,
        duration: 900,
        delay: 900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      timing(v.tagline, 1, 480, 1150),
    ]).start();

    // Barre de chargement indéterminée.
    Animated.loop(
      Animated.timing(v.loader, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    ).start();

    const timer = setTimeout(() => setIntroDone(true), INTRO_MS);
    return () => clearTimeout(timer);
  }, [reduceMotion, v]);

  // Halo qui respire tant que l'application n'est pas prête.
  useEffect(() => {
    if (!introDone || ready || reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v.glow, { toValue: 0.55, duration: 700, useNativeDriver: true }),
        Animated.timing(v.glow, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [introDone, ready, reduceMotion, v.glow]);

  // Sortie : l'écran suivant est déjà rendu dessous.
  useEffect(() => {
    if (!introDone || !ready || finished.current) return;
    finished.current = true;
    setLeaving(true);
    Animated.timing(v.exit, {
      toValue: 1,
      duration: reduceMotion ? 200 : 420,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onFinish());
  }, [introDone, ready, reduceMotion, onFinish, v.exit]);

  const markStyle = {
    opacity: v.mark.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
    transform: [
      { translateX: v.mark.interpolate({ inputRange: [0, 1], outputRange: [-48, 0] }) },
      { scale: v.mark.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) },
    ],
  };
  const glowStyle = {
    opacity: v.glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.75] }),
    transform: [{ scale: v.glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.08] }) }],
  };
  const wordStyle = {
    opacity: v.word,
    transform: [
      { translateY: v.word.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
      { scaleX: v.word.interpolate({ inputRange: [0, 1], outputRange: [1.12, 1] }) },
    ],
  };
  const shineStyle = {
    opacity: v.shine.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] }),
    transform: [
      { translateX: v.shine.interpolate({ inputRange: [0, 1], outputRange: [-160, WORD_W + 80] }) },
      { rotate: '18deg' },
    ],
  };
  const taglineStyle = {
    opacity: v.tagline,
    transform: [{ translateY: v.tagline.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  };
  const underlineStyle = {
    transform: [{ scaleX: v.tagline }],
  };
  const loaderStyle = {
    transform: [
      { translateX: v.loader.interpolate({ inputRange: [0, 1], outputRange: [-48, 120] }) },
    ],
  };
  const rootStyle = {
    opacity: v.exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    transform: [{ scale: v.exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
  };

  // Les traînées rejoignent les lignes de vitesse, à gauche du « R ».
  const STREAKS = [
    { top: -MARK_H * 0.13, w: 128, h: 5 },
    { top: MARK_H * 0.05, w: 104, h: 4 },
    { top: MARK_H * 0.21, w: 82, h: 4 },
  ];

  const version = Constants.expoConfig?.version;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, rootStyle]}
      pointerEvents={leaving ? 'none' : 'auto'}
      onLayout={() => void SplashScreen.hideAsync().catch(() => undefined)}
      accessibilityLabel="RUNEX Driver, chargement"
    >
      <LinearGradient
        colors={['#24272D', SPLASH_BACKGROUND, '#08090B']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.center}>
        <View style={{ width: MARK_W, height: MARK_H }}>
          <Animated.Image
            source={GLOW}
            style={[styles.glow, { left: MARK_W / 2 - 170, top: MARK_H / 2 - 170 }, glowStyle]}
          />
          {STREAKS.map((s, i) => (
            <Animated.View
              key={i}
              style={[
                styles.streak,
                {
                  top: MARK_H / 2 + s.top,
                  right: MARK_W * 0.62,
                  width: s.w,
                  height: s.h,
                  borderRadius: s.h,
                  opacity: v.streak[i]!.interpolate({
                    inputRange: [0, 0.6, 1],
                    outputRange: [0, 1, 0],
                  }),
                  transform: [
                    {
                      translateX: v.streak[i]!.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-width, 40],
                      }),
                    },
                    {
                      scaleX: v.streak[i]!.interpolate({
                        inputRange: [0, 0.7, 1],
                        outputRange: [2.4, 1.2, 0.6],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['rgba(227,30,43,0)', RED]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          ))}
          <Animated.Image source={MARK} style={[{ width: MARK_W, height: MARK_H }, markStyle]} />
        </View>

        <Animated.View style={[styles.wordWrap, wordStyle]}>
          <Image source={WORDMARK} style={{ width: WORD_W, height: WORD_H }} />
          <Animated.View pointerEvents="none" style={[styles.shine, shineStyle]}>
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Animated.View>

        <Animated.View style={[styles.taglineWrap, taglineStyle]}>
          <Text style={styles.tagline}>ESPACE LIVREUR</Text>
          <Animated.View style={[styles.underline, underlineStyle]} />
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View style={styles.loaderTrack}>
          <Animated.View style={[styles.loaderBar, loaderStyle]} />
        </View>
        {version ? <Text style={styles.version}>v{version}</Text> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: SPLASH_BACKGROUND, zIndex: 100, elevation: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 340, height: 340 },
  streak: { position: 'absolute', overflow: 'hidden' },
  wordWrap: { marginTop: 18, overflow: 'hidden' },
  shine: { position: 'absolute', top: -20, bottom: -20, width: 70 },
  taglineWrap: { marginTop: 22, alignItems: 'center' },
  tagline: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 6,
    marginLeft: 6,
  },
  underline: { marginTop: 10, width: 44, height: 2, borderRadius: 1, backgroundColor: RED },
  footer: { position: 'absolute', bottom: 56, left: 0, right: 0, alignItems: 'center' },
  loaderTrack: {
    width: 120,
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  loaderBar: { width: 48, height: 2, borderRadius: 1, backgroundColor: RED },
  version: { marginTop: 14, color: 'rgba(255,255,255,0.28)', fontSize: 11, letterSpacing: 1 },
});
