import { Platform } from 'react-native';

/**
 * Requests push notification permission and returns the FCM device token.
 * Requires a native build (Xcode / npx expo run:ios) — not available in Expo Go.
 * Returns null gracefully in Expo Go so the rest of the app is unaffected.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;

  try {
    // Dynamic import so the module missing in Expo Go doesn't crash at load time
    const messaging = (await import('@react-native-firebase/messaging')).default;

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) return null;

    return await messaging().getToken();
  } catch {
    // Native module not available (Expo Go) — silently skip
    return null;
  }
}

/**
 * Sets up a foreground message listener that shows an Alert for incoming chat messages.
 * No-op in Expo Go.
 */
export async function setupForegroundMessageHandler(
  onMessage: (title: string, body: string) => void
): Promise<(() => void) | null> {
  try {
    const messaging = (await import('@react-native-firebase/messaging')).default;
    const unsub = messaging().onMessage(async (remoteMessage) => {
      if (remoteMessage.data?.type !== 'chat_message') return;
      const title = remoteMessage.notification?.title ?? 'New message';
      const body = remoteMessage.notification?.body ?? '';
      onMessage(title, body);
    });
    return unsub;
  } catch {
    return null;
  }
}

/** No-op: chat notifications are sent server-side via Cloud Function trigger. */
export async function sendPushNotification(
  _token: string,
  _title: string,
  _body: string
): Promise<void> {
  // Intentional no-op: server-side only.
}
