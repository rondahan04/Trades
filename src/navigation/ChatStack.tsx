import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ConversationsListScreen } from '../screens/ConversationsListScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { colors } from '../theme';

export type ChatStackParamList = {
  ConversationsList: undefined;
  Chat: { otherUserId: string; otherUserName?: string; itemId?: string };
};

const Stack = createNativeStackNavigator<ChatStackParamList>();

export function ChatStack() {
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
        name="ConversationsList"
        component={ConversationsListScreen}
        options={{ title: 'Chat' }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          title: route.params.otherUserName ?? route.params.otherUserId,
        })}
      />
    </Stack.Navigator>
  );
}
