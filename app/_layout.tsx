import { Stack } from 'expo-router';

import { APP_NAME } from '@/config';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: APP_NAME }} />
      <Stack.Screen name="result" options={{ title: 'Result' }} />
    </Stack>
  );
}
