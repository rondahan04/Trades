import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts';
import { AuthStack } from './AuthStack';
import { TabNavigator } from './TabNavigator';
import { FirstTimeSetupScreen } from '../screens/FirstTimeSetupScreen';
import { View, Image, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

export type RootStackParamList = {
  Auth: undefined;
  Setup: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, isLoading, isFirstVisit, needsOnboarding } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.logoText}>Trades</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        needsOnboarding ? (
          <Stack.Screen name="Setup" component={FirstTimeSetupScreen} />
        ) : (
          <Stack.Screen name="Main" component={TabNavigator} />
        )
      ) : (
        <Stack.Screen name="Auth">
          {() => <AuthStack isFirstVisit={isFirstVisit} />}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 22,
  },
  logoText: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
});
