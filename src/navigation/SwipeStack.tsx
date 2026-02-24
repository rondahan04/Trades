import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SwipeDeckScreen } from '../screens/SwipeDeckScreen';
import { ItemDetailScreen } from '../screens/ItemDetailScreen';
import { colors } from '../theme';

export type SwipeStackParamList = {
  SwipeDeck: undefined;
  SwipeItemDetail: { itemId: string };
};

const Stack = createNativeStackNavigator<SwipeStackParamList>();

export function SwipeStack() {
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
        name="SwipeDeck"
        component={SwipeDeckScreen}
        options={{ title: 'Swipe', headerShown: true }}
      />
      <Stack.Screen
        name="SwipeItemDetail"
        component={ItemDetailScreen}
        options={{ title: 'Item', headerShown: true }}
      />
    </Stack.Navigator>
  );
}
