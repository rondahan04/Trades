import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useChat } from '../contexts';
import { getItemById } from '../utils/mockData';
import type { ChatStackParamList } from '../navigation/ChatStack';

export function ConversationsListScreen() {
  const { conversations } = useChat();
  const navigation = useNavigation<NativeStackNavigationProp<ChatStackParamList, 'ConversationsList'>>();

  if (conversations.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="chatbubbles-outline" size={64} color={colors.tabInactive} />
        <Text style={styles.emptyTitle}>No chats yet</Text>
        <Text style={styles.emptySubtitle}>
          Swipe right on items to match, then come here to chat with the owner.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.otherUser.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('Chat', { otherUserId: item.otherUser.id, otherUserName: item.otherUser.displayName, itemId: item.itemId || undefined })}
          activeOpacity={0.7}
        >
          {item.otherUser.avatarUrl ? (
            <Image source={{ uri: item.otherUser.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={28} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.body}>
            <Text style={styles.name}>{item.otherUser.displayName}</Text>
            <Text style={styles.preview} numberOfLines={1}>
              {item.lastMessage
                ? item.lastMessage.senderId === item.otherUser.id
                  ? item.lastMessage.text
                  : `You: ${item.lastMessage.text}`
                : 'Say hi to arrange the trade'}
            </Text>
          </View>
          {item.itemId ? (() => {
            const convItem = getItemById(item.itemId);
            const photoUri = convItem?.photos?.[0];
            return photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.itemThumb} />
            ) : (
              <View style={[styles.itemThumb, styles.itemThumbPlaceholder]}>
                <Ionicons name="image-outline" size={20} color={colors.textSecondary} />
              </View>
            );
          })() : null}
          <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
  },
  avatarPlaceholder: {
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 10,
  },
  itemThumbPlaceholder: {
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  preview: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
