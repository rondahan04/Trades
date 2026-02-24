import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItemById, getUserById, getItemsByOwnerId } from '../utils/mockData';
import type { User } from '../utils/mockData';

const CHAT_KEY = '@trades_chats';

/** Seed conversation for a@gmail.com (user-mock) with Omer (user-b) so we can see chat UI */
const MOCK_CHAT_SEED_KEY = 'user-b_user-mock';
const MOCK_CHAT_SEED: ChatMessage[] = [
  { id: 'seed-1', senderId: 'user-b', text: 'Hi! Interested in the jacket?', timestamp: Date.now() - 86400000 * 2 },
  { id: 'seed-2', senderId: 'user-mock', text: 'Yes! Is it still available?', timestamp: Date.now() - 86400000 * 2 + 300000 },
  { id: 'seed-3', senderId: 'user-b', text: 'Sure is. We can meet in Tel Aviv.', timestamp: Date.now() - 86400000 * 1 },
  { id: 'seed-4', senderId: 'user-mock', text: 'Perfect, I can do tomorrow afternoon.', timestamp: Date.now() - 3600000 },
];

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

export interface Conversation {
  otherUser: User;
  lastMessage: ChatMessage | null;
  itemId: string;
}

function getConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

interface ChatContextValue {
  conversations: Conversation[];
  getMessages: (otherUserId: string) => ChatMessage[];
  sendMessage: (otherUserId: string, text: string) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

interface ChatProviderProps {
  children: React.ReactNode;
  currentUserId: string | null;
  matchIds: string[];
}

export function ChatProvider({ children, currentUserId, matchIds }: ChatProviderProps) {
  const [messagesByConv, setMessagesByConv] = useState<Record<string, ChatMessage[]>>({});

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CHAT_KEY);
        let data: Record<string, ChatMessage[]> = raw ? JSON.parse(raw) : {};
        if (!data[MOCK_CHAT_SEED_KEY] || data[MOCK_CHAT_SEED_KEY].length === 0) {
          data = { ...data, [MOCK_CHAT_SEED_KEY]: MOCK_CHAT_SEED };
          await AsyncStorage.setItem(CHAT_KEY, JSON.stringify(data));
        }
        setMessagesByConv(data);
      } catch {
        // ignore
      }
    })();
  }, []);

  const persist = useCallback((data: Record<string, ChatMessage[]>) => {
    AsyncStorage.setItem(CHAT_KEY, JSON.stringify(data));
  }, []);

  const getMessages = useCallback(
    (otherUserId: string): ChatMessage[] => {
      if (!currentUserId) return [];
      const cid = getConversationId(currentUserId, otherUserId);
      return messagesByConv[cid] ?? [];
    },
    [currentUserId, messagesByConv]
  );

  const sendMessage = useCallback(
    (otherUserId: string, text: string) => {
      if (!currentUserId || !text.trim()) return;
      const cid = getConversationId(currentUserId, otherUserId);
      const msg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        senderId: currentUserId,
        text: text.trim(),
        timestamp: Date.now(),
      };
      setMessagesByConv((prev) => {
        const list = [...(prev[cid] ?? []), msg];
        const next = { ...prev, [cid]: list };
        persist(next);
        return next;
      });
    },
    [currentUserId, persist]
  );

  const conversations: Conversation[] = React.useMemo(() => {
    if (!currentUserId) return [];
    const seen = new Set<string>();
    const list: Conversation[] = [];

    for (const itemId of matchIds) {
      const item = getItemById(itemId);
      if (!item || seen.has(item.ownerId)) continue;
      seen.add(item.ownerId);
      const other = getUserById(item.ownerId);
      if (!other) continue;
      const cid = getConversationId(currentUserId, item.ownerId);
      const msgs = messagesByConv[cid] ?? [];
      const lastMessage = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      list.push({ otherUser: other, lastMessage, itemId });
    }

    for (const cid of Object.keys(messagesByConv)) {
      const parts = cid.split('_');
      if (parts.length !== 2) continue;
      const otherId: string = parts[0] === currentUserId ? parts[1] : parts[0];
      if (otherId === currentUserId) continue;
      if (seen.has(otherId)) continue;
      seen.add(otherId);
      const other = getUserById(otherId);
      if (!other) continue;
      const msgs = messagesByConv[cid] ?? [];
      const lastMessage = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      const fallbackItemId = getItemsByOwnerId(otherId)[0]?.id ?? '';
      list.push({ otherUser: other, lastMessage, itemId: fallbackItemId });
    }

    list.sort((a, b) => (b.lastMessage?.timestamp ?? 0) - (a.lastMessage?.timestamp ?? 0));
    return list;
  }, [currentUserId, matchIds, messagesByConv]);

  const value: ChatContextValue = {
    conversations,
    getMessages,
    sendMessage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
