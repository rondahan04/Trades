import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ItemDetailScreen } from '../screens/ItemDetailScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { LeaveReviewScreen } from '../screens/LeaveReviewScreen';
import type { LeaveReviewParams } from '../screens/LeaveReviewScreen';
import { colors } from '../theme';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  ProfileItemDetail: { itemId: string };
  EditProfile: undefined;
  LeaveReview: LeaveReviewParams;
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
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile', headerShown: true }}
      />
      <Stack.Screen
        name="LeaveReview"
        component={LeaveReviewScreen}
        options={{ title: 'Leave review', headerShown: true }}
      />
    </Stack.Navigator>
  );
}
