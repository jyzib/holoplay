import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../constants/theme';

interface IntroSplashProps {
  onFinish: () => void;
}

export function IntroSplash({ onFinish }: IntroSplashProps) {
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const creditOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(creditOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(500),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);

    sequence.start(({ finished }) => {
      if (finished) onFinish();
    });

    return () => sequence.stop();
  }, [creditOpacity, logoOpacity, logoScale, onFinish, screenOpacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.overlay, { opacity: screenOpacity }]}
    >
      <View style={styles.center}>
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}
        >
          <Text style={styles.logo}>
            <Text style={styles.logoAccent}>HOLO</Text>PLAY
          </Text>
        </Animated.View>
      </View>
      <Animated.Text style={[styles.credit, { opacity: creditOpacity }]}>
        Built with ❤️ by Jazib Zaidi
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 100,
    elevation: 100,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 4,
  },
  logoAccent: {
    color: colors.netflixRed,
  },
  credit: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: 0,
    right: 0,
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
