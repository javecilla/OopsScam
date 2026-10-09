import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View, Text as NativeText } from 'react-native';
import { APP_NAME } from '@/config';
import { preloadLlm } from '@/pipeline';
import { brutalist, colors, fonts, shape, spacing } from '@/theme';
import { cleanupAbandonedImages } from '@/vision/images';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Poppins-Regular': require('../assets/fonts/Poppins/Poppins-Regular.ttf'),
    'Poppins-Medium': require('../assets/fonts/Poppins/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins/Poppins-Bold.ttf'),
  });
  const [fontDeadline, setFontDeadline] = useState(false);
  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    cleanupAbandonedImages();
    preloadLlm();
    const timer = setTimeout(() => setFontDeadline(true), 3000);

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();

    return () => {
      clearTimeout(timer);
      animation.stop();
    };
  }, [pulseAnim]);

  if (!loaded && !error && !fontDeadline) {
    return (
      <View style={styles.loading}>
        <View style={styles.loadingCard}>
          <View style={styles.loadingBadge}>
            <NativeText style={styles.loadingBadgeText}>PHANTOM ALERT</NativeText>
          </View>
          <Animated.Image
            source={require('../assets/images/oopsscam-logo-LIGHT NO BG.png')}
            style={[styles.logoImage, { transform: [{ scale: pulseAnim }] }]}
            resizeMode="contain"
          />
          <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
          <NativeText style={styles.loadingTitle}>Protecting your phone…</NativeText>
          <NativeText style={styles.loadingSubtitle}>
            {"Stay calm. We're keeping scams away."}
          </NativeText>
        </View>
      </View>
    );
  }
  return (
    <ShareIntentProvider options={{ resetOnBackground: true }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.frame },
          headerTintColor: colors.onFrame,
          headerTitleStyle: { fontFamily: loaded ? fonts.semibold : undefined },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: APP_NAME,
            headerTitle: () => (
              <NativeText
                accessibilityLabel={APP_NAME}
                maxFontSizeMultiplier={1.3}
                style={[styles.brand, { fontFamily: loaded ? fonts.bold : undefined }]}
              >
                Oops<NativeText style={styles.red}>Scam</NativeText>
              </NativeText>
            ),
          }}
        />
        <Stack.Screen name="result" options={{ title: 'Result' }} />
        <Stack.Screen name="qr" options={{ title: 'Scan QR Code' }} />
        <Stack.Screen name="screenshot" options={{ title: 'Review Screenshot' }} />
        <Stack.Screen name="history" options={{ title: 'Scan History' }} />
      </Stack>
    </ShareIntentProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    padding: spacing.xl,
    borderRadius: shape.panel,
    alignItems: 'center',
    borderWidth: brutalist.borderWidth,
    borderColor: brutalist.borderColor,
    borderRightWidth: brutalist.borderWidth + brutalist.offset,
    borderBottomWidth: brutalist.borderWidth + brutalist.offset,
    gap: spacing.sm,
    width: '88%',
    maxWidth: 340,
  },
  loadingBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: shape.control,
    borderWidth: 1,
    borderColor: colors.ink,
    transform: [{ skewX: '-8deg' }],
    marginBottom: spacing.xs,
  },
  loadingBadgeText: {
    color: colors.onPrimary,
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginVertical: spacing.xs,
  },
  spinner: {
    marginVertical: spacing.xs,
  },
  loadingTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingSubtitle: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  brand: { color: colors.onFrame, fontSize: 20 },
  red: { color: '#FF8799' },
});
