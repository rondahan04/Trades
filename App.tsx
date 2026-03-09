import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, AppDataProvider, useAuth, useAppData } from './src/contexts';
import { ChatProvider } from './src/contexts';
import { RootNavigator } from './src/navigation';
import { registerForPushNotificationsAsync } from './src/services/notificationService';
import { savePushToken } from './src/services/dbService';
import { isFirebaseEnabled } from './src/config/firebase';

function AppContent() {
  const { user } = useAuth();
  const { matchIds } = useAppData();
  const registeredForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !isFirebaseEnabled() || registeredForRef.current === user.id) return;
    registeredForRef.current = user.id;
    registerForPushNotificationsAsync().then((token) => {
      if (token) savePushToken(user.id, token).catch(() => {});
    });
  }, [user]);

  return (
    <ChatProvider currentUserId={user?.id ?? null} matchIds={matchIds}>
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style="dark" />
      </NavigationContainer>
    </ChatProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppDataProvider>
            <AppContent />
          </AppDataProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
