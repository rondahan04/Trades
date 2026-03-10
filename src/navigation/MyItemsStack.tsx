import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MyItemsScreen } from '../screens/MyItemsScreen';
import { MyItemDashboardScreen } from '../screens/MyItemDashboardScreen';
import { NewItemScreen } from '../screens/NewItemScreen';
import { LeaveReviewScreen } from '../screens/LeaveReviewScreen';
import type { LeaveReviewParams } from '../screens/LeaveReviewScreen';
import { colors } from '../theme';

export type MyItemsStackParamList = {
  MyItemsList: undefined;
  MyItemsItemDetail: { itemId: string };
  NewItem: undefined;
  LeaveReview: LeaveReviewParams;
};

const Stack = createNativeStackNavigator<MyItemsStackParamList>();

export function MyItemsStack() {
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
        name="MyItemsList"
        component={MyItemsScreen}
        options={{ title: 'My Items', headerShown: true }}
      />
      <Stack.Screen
        name="MyItemsItemDetail"
        component={MyItemDashboardScreen}
        options={{ title: 'Item', headerShown: true }}
      />
      <Stack.Screen
        name="NewItem"
        component={NewItemScreen}
        options={{ title: 'New Item', headerShown: true }}
      />
      <Stack.Screen
        name="LeaveReview"
        component={LeaveReviewScreen}
        options={{ title: 'Leave a Review', headerShown: true }}
      />
    </Stack.Navigator>
  );
}
