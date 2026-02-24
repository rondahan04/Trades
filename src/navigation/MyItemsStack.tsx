import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MyItemsScreen } from '../screens/MyItemsScreen';
import { ItemDetailScreen } from '../screens/ItemDetailScreen';
import { colors } from '../theme';

export type MyItemsStackParamList = {
  MyItemsList: undefined;
  ItemDetail: { itemId: string };
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
        name="ItemDetail"
        component={ItemDetailScreen}
        options={{ title: 'Item', headerShown: true }}
      />
    </Stack.Navigator>
  );
}
