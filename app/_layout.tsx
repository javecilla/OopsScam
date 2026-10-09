import { Stack } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import { useEffect } from 'react';

import { APP_NAME } from '@/config';
import { preloadLlm } from '@/pipeline';
import { colors } from '@/theme';

export default function RootLayout() {
  // Load the model in the background so the first explanation is faster.
  useEffect(() => {
    preloadLlm();
  }, []);

  return (
    <ShareIntentProvider options={{ resetOnBackground: true }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: APP_NAME }} />
        <Stack.Screen name="result" options={{ title: 'Resulta' }} />
      </Stack>
    </ShareIntentProvider>
  );
}
