// App entry: Expo Router, plus the optional SMS auto-check background task (SRS 3.13).
import 'expo-router/entry';
import { AppRegistry } from 'react-native';

import { smsCheckTask } from './src/sms/backgroundCheck';
import { notifyRisk } from './src/sms/smsWatch';

// Started by SmsCheckTaskService in modules/sms-watch. Rules and classifier only (FR-SM-03).
AppRegistry.registerHeadlessTask(
  'OopsScamSmsCheck',
  () =>
    async ({ text }: { text: string }) =>
      smsCheckTask(text, notifyRisk),
);
