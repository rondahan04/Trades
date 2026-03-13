import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts';
import { AuthStack } from './AuthStack';
import { TabNavigator } from './TabNavigator';
import { View, Image, StyleSheet } from 'react-native';
import { colors } from '../theme';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, isLoading, isFirstVisit } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Main" component={TabNavigator} />
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
    backgroundColor: colors.background,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 28,
  },
});
