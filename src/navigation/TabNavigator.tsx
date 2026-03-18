import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { SwipeStack } from './SwipeStack';
import { MyItemsStack } from './MyItemsStack';
import { ChatStack } from './ChatStack';
import { ProfileStack } from './ProfileStack';
import { useAuth } from '../contexts';
import { savePushToken } from '../services/dbService';
import { registerForPushNotificationsAsync, setupForegroundMessageHandler } from '../services/notificationService';

export type TabParamList = {
  Swipe: undefined;
  'My Items': undefined;
  Chat: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
  const { user } = useAuth();

  // Register FCM token (no-op in Expo Go, works in native build)
  useEffect(() => {
    if (!user?.id) return;
    registerForPushNotificationsAsync()
      .then((token) => { if (token) savePushToken(user.id, token); })
      .catch(() => {});
  }, [user?.id]);

  // Foreground message handler (no-op in Expo Go, works in native build)
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    setupForegroundMessageHandler((title, body) => Alert.alert(title, body))
      .then((unsub) => { cleanup = unsub; });
    return () => { cleanup?.(); };
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
        },
        tabBarLabelStyle: { fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Swipe"
        component={SwipeStack}
        options={{
          title: 'Swipe',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-horizontal" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="My Items"
        component={MyItemsStack}
        options={{
          title: 'My Items',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={{
          title: 'Chat',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
