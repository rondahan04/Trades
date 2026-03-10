import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItemById, getUserById, getItemsByOwnerId } from '../utils/mockData';
import type { User } from '../utils/mockData';
import { isFirebaseEnabled } from '../config/firebase';
import {
  getConversationId,
  sendChatMessage,
  listenToConversationMessages,
  listenToUserConversations,
  fetchUserProfile,
  fetchItemById,
  type ConversationDoc,
} from '../services/dbService';

const CHAT_KEY = '@trades_chats';

/** Seed conversation for mock mode (a@gmail.com / user-mock ↔ user-b) */
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
  itemPhoto?: string;
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
  const [conversationDocs, setConversationDocs] = useState<ConversationDoc[]>([]);
  const [otherUsers, setOtherUsers] = useState<Record<string, User>>({});

  const messageListenersRef = useRef<Record<string, () => void>>({});
  const fetchedUserIdsRef = useRef(new Set<string>());
  const fetchedItemIdsRef = useRef(new Set<string>());
  const [itemPhotos, setItemPhotos] = useState<Record<string, string>>({});

  const firebaseMode = isFirebaseEnabled() && !!currentUserId;

  // Firebase: listen to the user's conversation list
  useEffect(() => {
    if (!firebaseMode || !currentUserId) return;
    const unsub = listenToUserConversations(currentUserId, setConversationDocs);
    return unsub;
  }, [firebaseMode, currentUserId]);

  // Firebase: set up per-conversation message listeners as conversations are discovered
  useEffect(() => {
    if (!firebaseMode) return;
    for (const conv of conversationDocs) {
      if (!messageListenersRef.current[conv.id]) {
        const unsub = listenToConversationMessages(conv.id, (msgs) => {
          setMessagesByConv((prev) => ({ ...prev, [conv.id]: msgs }));
        });
        messageListenersRef.current[conv.id] = unsub;
      }
    }
  }, [firebaseMode, conversationDocs]);

  // Firebase: fetch Firestore profiles for users we haven't seen yet
  useEffect(() => {
    if (!firebaseMode || !currentUserId || conversationDocs.length === 0) return;
    const toFetch = [
      ...new Set(
        conversationDocs
          .flatMap((d) => d.participantIds.filter((id) => id !== currentUserId))
          .filter((id) => !fetchedUserIdsRef.current.has(id))
      ),
    ];
    if (toFetch.length === 0) return;
    toFetch.forEach((id) => fetchedUserIdsRef.current.add(id));
    Promise.all(toFetch.map(fetchUserProfile)).then((profiles) => {
      const updated: Record<string, User> = {};
      toFetch.forEach((id, i) => { if (profiles[i]) updated[id] = profiles[i]!; });
      if (Object.keys(updated).length > 0) {
        setOtherUsers((prev) => ({ ...prev, ...updated }));
      }
    });
  }, [firebaseMode, conversationDocs, currentUserId]);

  // Firebase: fetch item first-photos for conversations we haven't resolved yet
  useEffect(() => {
    if (!firebaseMode || conversationDocs.length === 0) return;
    const toFetch = conversationDocs
      .map((d) => d.itemId)
      .filter((id) => id && !fetchedItemIdsRef.current.has(id));
    if (toFetch.length === 0) return;
    toFetch.forEach((id) => fetchedItemIdsRef.current.add(id));
    toFetch.forEach((id) => {
      // Check mock data first (fast path)
      const { getItemById } = require('../utils/mockData');
      const local = getItemById(id);
      if (local?.photos?.[0]) {
        setItemPhotos((prev) => ({ ...prev, [id]: local.photos[0] }));
        return;
      }
      fetchItemById(id).then((item) => {
        if (item?.photos?.[0]) {
          setItemPhotos((prev) => ({ ...prev, [id]: item.photos[0] }));
        }
      }).catch(() => {});
    });
  }, [firebaseMode, conversationDocs]);

  // Cleanup all message listeners on unmount
  useEffect(() => {
    return () => {
      Object.values(messageListenersRef.current).forEach((fn) => fn());
      messageListenersRef.current = {};
    };
  }, []);

  // Mock mode: load messages from AsyncStorage
  useEffect(() => {
    if (firebaseMode) return;
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
  }, [firebaseMode]);

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

      if (firebaseMode) {
        const convDoc = conversationDocs.find((d) => d.id === cid);
        const itemId = convDoc?.itemId ?? '';
        sendChatMessage(cid, [currentUserId, otherUserId].sort(), itemId, currentUserId, text.trim()).catch((e) => {
          if (__DEV__) console.warn('sendChatMessage failed:', e);
        });
      } else {
        const msg: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          senderId: currentUserId,
          text: text.trim(),
          timestamp: Date.now(),
        };
        setMessagesByConv((prev) => {
          const list = [...(prev[cid] ?? []), msg];
          const next = { ...prev, [cid]: list };
          AsyncStorage.setItem(CHAT_KEY, JSON.stringify(next));
          return next;
        });
      }
    },
    [currentUserId, firebaseMode, conversationDocs]
  );

  const conversations = useMemo((): Conversation[] => {
    if (!currentUserId) return [];

    if (firebaseMode) {
      return conversationDocs
        .map((d) => {
          const otherId = d.participantIds.find((id) => id !== currentUserId) ?? '';
          const otherUser: User = otherUsers[otherId] ?? getUserById(otherId) ?? {
            id: otherId,
            displayName: 'Trader',
            email: '',
          };
          const msgs = messagesByConv[d.id] ?? [];
          const lastMessage = msgs.length > 0 ? msgs[msgs.length - 1] : null;
          return { otherUser, lastMessage, itemId: d.itemId, itemPhoto: itemPhotos[d.itemId] };
        })
        .sort((a, b) => (b.lastMessage?.timestamp ?? 0) - (a.lastMessage?.timestamp ?? 0));
    }

    // Mock mode: build from matchIds + existing message history
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
  }, [currentUserId, firebaseMode, conversationDocs, messagesByConv, otherUsers, itemPhotos, matchIds]);

  const value: ChatContextValue = { conversations, getMessages, sendMessage };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
