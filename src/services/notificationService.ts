import { Alert } from 'react-native';

/**
 * MOCK: Simulates asking the user for permission and generates a fake token.
 * This bypasses the Apple Developer requirement and Expo SDK 53 limitations.
 */
export async function registerForPushNotificationsAsync(): Promise<string> {
  console.log('MOCK: Requesting push notification permissions...');

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const fakeToken = `MockToken_${Math.random().toString(36).substring(2, 15)}`;
  console.log('MOCK: Generated fake push token:', fakeToken);

  return fakeToken;
}

/**
 * MOCK: Simulates sending a push notification.
 * Instead of going through Apple/Google, it instantly triggers an in-app UI alert.
 */
export async function sendPushNotification(expoPushToken: string, title: string, body: string) {
  console.log(`MOCK: Sending push notification to [${expoPushToken}]`);
  console.log(`MOCK: Title: ${title} | Body: ${body}`);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Trigger an immediate UI alert so you can visually test the flow!
  Alert.alert(
    title,
    body,
    [{ text: 'Awesome!', onPress: () => console.log('Mock notification dismissed') }]
  );
}
