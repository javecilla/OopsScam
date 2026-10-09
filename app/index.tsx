import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';

export default function HomeScreen() {
  const router = useRouter();

  // TODO: text box, Paste, sample messages, status strip (SRS 4.1)
  return (
    <Screen>
      <Text>Home</Text>
      <Button title="Go to Result" onPress={() => router.push('/result')} />
    </Screen>
  );
}
