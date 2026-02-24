import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ItemDetailScreen } from '../screens/ItemDetailScreen';
import { colors } from '../theme';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  ProfileItemDetail: { itemId: string };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: 'Profile', headerShown: true }}
      />
      <Stack.Screen
        name="ProfileItemDetail"
        component={ItemDetailScreen}
        options={{ title: 'Item', headerShown: true }}
      />
    </Stack.Navigator>
  );
}
