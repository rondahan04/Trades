import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useChat } from '../contexts';
import { useAuth } from '../contexts';
import { getUserById, getItemById } from '../utils/mockData';
import { fetchUserProfile } from '../services/dbService';
import type { ChatMessage } from '../contexts/ChatContext';
import type { User } from '../utils/mockData';

export function ChatScreen({
  route,
}: {
  route: { params: { otherUserId: string; otherUserName?: string; itemId?: string } };
}) {
  const { otherUserId, otherUserName, itemId } = route.params;
  const { getMessages, sendMessage } = useChat();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [otherUser, setOtherUser] = useState<User | null>(
    () => getUserById(otherUserId) ?? null
  );
  const [userLoading, setUserLoading] = useState(!otherUser);

  // Fetch from Firestore if not in mock data
  useEffect(() => {
    if (otherUser) return;
    setUserLoading(true);
    fetchUserProfile(otherUserId)
      .then((profile) => {
        if (profile) setOtherUser(profile);
        else setOtherUser({ id: otherUserId, displayName: otherUserName ?? 'Trader', email: '' });
      })
      .catch(() => {
        setOtherUser({ id: otherUserId, displayName: otherUserName ?? 'Trader', email: '' });
      })
      .finally(() => setUserLoading(false));
  }, [otherUserId]);

  const messages = getMessages(otherUserId);
  const chatItem = itemId ? getItemById(itemId) : undefined;

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(otherUserId, input.trim());
    setInput('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  if (userLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === user?.id;
    return (
      <View style={[styles.bubbleWrap, isMe && styles.bubbleWrapMe]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
          <Text style={[styles.time, isMe && styles.timeMe]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={renderMessage}
        ListHeaderComponent={
          chatItem && chatItem.photos?.[0] ? (
            <View style={styles.itemHeader}>
              <Image source={{ uri: chatItem.photos[0] }} style={styles.itemHeaderImage} />
              <View style={styles.itemHeaderText}>
                <Text style={styles.itemHeaderTitle} numberOfLines={1}>{chatItem.title}</Text>
                <Text style={styles.itemHeaderTier}>{chatItem.valueTier}</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyText}>No messages yet. Say hi to arrange the trade!</Text>
          </View>
        }
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor={colors.textSecondary}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim()}
        >
          <Ionicons name="send" size={22} color={input.trim() ? colors.surface : colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: 16,
    paddingBottom: 12,
    flexGrow: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  itemHeaderImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: colors.borderLight,
  },
  itemHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  itemHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  itemHeaderTier: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bubbleWrap: {
    alignSelf: 'flex-start',
    maxWidth: '80%',
    marginBottom: 10,
  },
  bubbleWrapMe: {
    alignSelf: 'flex-end',
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    backgroundColor: colors.borderLight,
    maxWidth: '100%',
  },
  bubbleMe: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {},
  bubbleText: {
    fontSize: 16,
    color: colors.text,
  },
  bubbleTextMe: {
    color: colors.textOnPrimary,
  },
  time: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  timeMe: {
    color: 'rgba(45,52,54,0.7)',
  },
  emptyChat: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 16,
    color: colors.text,
    maxHeight: 100,
    marginRight: 10,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.borderLight,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
