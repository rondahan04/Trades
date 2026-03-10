import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { colors } from '../theme';
import { useChat } from '../contexts';
import { useAuth } from '../contexts';
import { getUserById, getItemById } from '../utils/mockData';
import { fetchUserProfile, fetchItemById, fetchMatchForItem, prepareImageForChat } from '../services/dbService';
import { isFirebaseEnabled } from '../config/firebase';
import type { ChatMessage } from '../contexts/ChatContext';
import type { User, Item } from '../utils/mockData';

// ── Emoji panel data ──────────────────────────────────────────────────────────
const EMOJIS = [
  '😀','😂','🥹','😍','🥰','😎','🤩','😜','🤔','😤',
  '😢','😭','😡','🥳','🤯','🫡','😴','🤤','🤑','😈',
  '👍','👎','👏','🙌','🤝','✌️','🤞','💪','🫶','❤️',
  '🧡','💛','💚','💙','💜','🖤','💔','💯','🔥','✨',
  '🎉','🎊','🏆','🥇','⚽','🎮','🍕','🍔','🍦','☕',
];

// ── Message prefixes ──────────────────────────────────────────────────────────
const IMG_PREFIX = 'data:image/';
const AUDIO_PREFIX = 'data:audio/';

export function ChatScreen({
  route,
}: {
  route: { params: { otherUserId: string; otherUserName?: string; itemId?: string } };
}) {
  const { otherUserId, otherUserName, itemId } = route.params;
  const { getMessages, sendMessage } = useChat();
  const { user } = useAuth();
  const [myProfile, setMyProfile] = useState<User | null>(null);
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [swipeToDelete, setSwipeToDelete] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartXRef = useRef(0);
  const swipeToDeleteRef = useRef(false);
  const swipeX = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const [otherUser, setOtherUser] = useState<User | null>(
    () => getUserById(otherUserId) ?? null
  );
  const [userLoading, setUserLoading] = useState(!otherUser);
  const [theirItem, setTheirItem] = useState<Item | undefined>(
    () => (itemId ? getItemById(itemId) : undefined)
  );
  const [myItem, setMyItem] = useState<Item | undefined>();

  // Fetch other user
  useEffect(() => {
    if (otherUser) return;
    setUserLoading(true);
    fetchUserProfile(otherUserId)
      .then((profile) => {
        if (profile) setOtherUser(profile);
        else setOtherUser({ id: otherUserId, displayName: otherUserName ?? 'Trader', email: '' });
      })
      .catch(() => setOtherUser({ id: otherUserId, displayName: otherUserName ?? 'Trader', email: '' }))
      .finally(() => setUserLoading(false));
  }, [otherUserId]);

  // Fetch current user's profile (for avatar on sent messages)
  useEffect(() => {
    if (!user?.id || !isFirebaseEnabled()) return;
    fetchUserProfile(user.id).then((p) => { if (p) setMyProfile(p); }).catch(() => {});
  }, [user?.id]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [isRecording]);

  // Animated dots while recording
  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(dotAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      dotAnim.setValue(0.3);
    }
  }, [isRecording, dotAnim]);

  // Fetch both trade items
  useEffect(() => {
    if (!itemId || !isFirebaseEnabled()) return;
    if (!theirItem) {
      fetchItemById(itemId).then((item) => { if (item) setTheirItem(item); }).catch(() => {});
    }
    fetchMatchForItem(itemId).then((match) => {
      if (!match) return;
      const myItemId = match.itemIds.find((id) => id !== itemId);
      if (!myItemId) return;
      const local = getItemById(myItemId);
      if (local) { setMyItem(local); return; }
      fetchItemById(myItemId).then((item) => { if (item) setMyItem(item); }).catch(() => {});
    }).catch(() => {});
  }, [itemId]);

  const messages = getMessages(otherUserId);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    sendMessage(otherUserId, input.trim());
    setInput('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [input, otherUserId, sendMessage]);

  const handleSendLike = useCallback(() => {
    sendMessage(otherUserId, '👍');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [otherUserId, sendMessage]);

  const handlePickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setImageUploading(true);
    try {
      const dataUrl = await prepareImageForChat(result.assets[0].uri);
      sendMessage(otherUserId, dataUrl);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      // silently fail — user's image just won't send
    } finally {
      setImageUploading(false);
    }
  }, [otherUserId, sendMessage]);

  const handleEmojiPick = useCallback((emoji: string) => {
    setInput((prev) => prev + emoji);
  }, []);

  const formatRecordTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setRecordingSeconds(0);
      setSwipeToDelete(false);
      swipeToDeleteRef.current = false;
      swipeX.setValue(0);
      setIsRecording(true);
    } catch {}
  }, [swipeX]);

  const cancelRecording = useCallback(async () => {
    try { await recordingRef.current?.stopAndUnloadAsync(); } catch {}
    recordingRef.current = null;
    setIsRecording(false);
    setRecordingSeconds(0);
    setSwipeToDelete(false);
    swipeToDeleteRef.current = false;
    swipeX.setValue(0);
    Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
  }, [swipeX]);

  const sendRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setRecordingSeconds(0);
      if (!uri) return;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      sendMessage(otherUserId, `data:audio/m4a;base64,${base64}`);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      recordingRef.current = null;
      setRecordingSeconds(0);
    }
  }, [otherUserId, sendMessage]);

  const handlePlayAudio = useCallback(async (msgId: string, dataUrl: string) => {
    // Stop current playback if playing same message
    if (playingMsgId === msgId) {
      await soundRef.current?.stopAsync();
      await soundRef.current?.unloadAsync();
      soundRef.current = null;
      setPlayingMsgId(null);
      return;
    }
    // Stop previous
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setPlayingMsgId(msgId);
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: dataUrl });
      soundRef.current = sound;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingMsgId(null);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch {
      setPlayingMsgId(null);
    }
  }, [playingMsgId]);

  if (userLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMe = item.senderId === user?.id;
    const prevMsg = messages[index - 1];
    const nextMsg = messages[index + 1];
    const isFirstInGroup = !prevMsg || prevMsg.senderId !== item.senderId;
    const isLastInGroup = !nextMsg || nextMsg.senderId !== item.senderId;
    const isImage = item.text.startsWith(IMG_PREFIX);
    const isAudio = item.text.startsWith(AUDIO_PREFIX);

    const bubbleRadius = 18;
    const tailRadius = 4;
    const bubbleStyle = isMe
      ? {
          borderTopLeftRadius: bubbleRadius,
          borderBottomLeftRadius: bubbleRadius,
          borderTopRightRadius: isFirstInGroup ? bubbleRadius : tailRadius,
          borderBottomRightRadius: isLastInGroup ? bubbleRadius : tailRadius,
        }
      : {
          borderTopRightRadius: bubbleRadius,
          borderBottomRightRadius: bubbleRadius,
          borderTopLeftRadius: isFirstInGroup ? bubbleRadius : tailRadius,
          borderBottomLeftRadius: isLastInGroup ? bubbleRadius : tailRadius,
        };

    const meAvatarUrl = myProfile?.avatarUrl;
    const meInitial = (myProfile?.displayName ?? user?.displayName ?? '?')[0]?.toUpperCase() ?? '?';

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
        {!isMe && (
          <View style={styles.avatarCol}>
            {isLastInGroup ? (
              otherUser?.avatarUrl ? (
                <Image source={{ uri: otherUser.avatarUrl }} style={styles.msgAvatar} />
              ) : (
                <View style={[styles.msgAvatar, styles.msgAvatarFallback]}>
                  <Text style={styles.msgAvatarInitial}>
                    {otherUser?.displayName?.[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )
            ) : (
              <View style={styles.msgAvatarSpacer} />
            )}
          </View>
        )}

        <View style={[
          styles.bubble,
          isMe ? styles.bubbleMe : styles.bubbleThem,
          isImage && styles.bubbleImage,
          isAudio && styles.bubbleAudio,
          bubbleStyle,
        ]}>
          {isImage ? (
            <Image source={{ uri: item.text }} style={styles.msgImage} resizeMode="cover" />
          ) : isAudio ? (
            <TouchableOpacity
              style={styles.audioBubble}
              onPress={() => handlePlayAudio(item.id, item.text)}
            >
              <Ionicons
                name={playingMsgId === item.id ? 'pause-circle' : 'play-circle'}
                size={32}
                color={isMe ? colors.textOnPrimary : colors.primaryDark}
              />
              <View style={styles.audioWave}>
                {[4,7,10,7,5,9,6,8,4,7,10,6].map((h, i) => (
                  <View
                    key={i}
                    style={[
                      styles.audioBar,
                      {
                        height: h * 2,
                        backgroundColor: isMe
                          ? 'rgba(255,255,255,0.7)'
                          : colors.primaryDark,
                        opacity: playingMsgId === item.id ? 1 : 0.5,
                      },
                    ]}
                  />
                ))}
              </View>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
          )}
          {isLastInGroup && (
            <Text style={[styles.time, isMe ? styles.timeMe : styles.timeThem]}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>

        {isMe && (
          <View style={styles.avatarCol}>
            {isLastInGroup ? (
              meAvatarUrl ? (
                <Image source={{ uri: meAvatarUrl }} style={styles.msgAvatar} />
              ) : (
                <View style={[styles.msgAvatar, styles.msgAvatarFallback]}>
                  <Text style={styles.msgAvatarInitial}>{meInitial}</Text>
                </View>
              )
            ) : (
              <View style={styles.msgAvatarSpacer} />
            )}
          </View>
        )}
      </View>
    );
  };

  const hasInput = input.trim().length > 0;

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
          (theirItem || myItem) ? (
            <View style={styles.tradeHeader}>
              {[
                myItem    ? { item: myItem,    label: 'Your listing' }    : null,
                theirItem ? { item: theirItem, label: 'Their listing' } : null,
              ]
                .filter((x): x is { item: Item; label: string } => x !== null)
                .map(({ item, label }) => (
                  <View key={item.id} style={styles.tradeCard}>
                    {item.photos?.[0] ? (
                      <Image source={{ uri: item.photos[0] }} style={styles.tradeThumb} />
                    ) : (
                      <View style={[styles.tradeThumb, styles.tradeThumbEmpty]}>
                        <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
                      </View>
                    )}
                    <Text style={styles.tradeLabel}>{label}</Text>
                    <Text style={styles.tradeTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.tradeMeta}>{item.valueTier}</Text>
                  </View>
                ))
              }
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyText}>No messages yet. Say hi to arrange the trade!</Text>
          </View>
        }
      />

      {/* Emoji panel */}
      {showEmoji && (
        <View style={styles.emojiPanel}>
          <ScrollView
            horizontal={false}
            contentContainerStyle={styles.emojiGrid}
            showsVerticalScrollIndicator={false}
          >
            {EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiItem}
                onPress={() => handleEmojiPick(emoji)}
              >
                <Text style={styles.emojiChar}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input bar — unified, same height in all states */}
      <View style={styles.inputBar}>
        {/* Left: image picker (normal) OR trash icon (recording) */}
        {isRecording ? (
          <Ionicons
            name="trash-outline"
            size={22}
            color={swipeToDelete ? '#E53E3E' : colors.textSecondary}
            style={styles.iconBtn}
          />
        ) : !hasInput ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handlePickImage}
            disabled={imageUploading}
          >
            {imageUploading
              ? <ActivityIndicator size="small" color={colors.primaryDark} />
              : <Ionicons name="image-outline" size={24} color={colors.primaryDark} />
            }
          </TouchableOpacity>
        ) : null}

        {/* Center: text input OR recording indicator */}
        {isRecording ? (
          <Animated.View
            style={[styles.recSlide, { transform: [{ translateX: swipeX }] }]}
          >
            <Text style={styles.recTimer}>{formatRecordTime(recordingSeconds)}</Text>
            <View style={styles.recDotsRow}>
              {Array.from({ length: 12 }).map((_, i) => (
                <Animated.View
                  key={i}
                  style={[styles.recDot, {
                    opacity: dotAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [i % 2 === 0 ? 0.2 : 0.55, i % 2 === 0 ? 0.65 : 0.2],
                    }),
                    height: 4 + (i % 3) * 3,
                  }]}
                />
              ))}
            </View>
            <View style={styles.recHintRow}>
              <Ionicons name="chevron-back" size={12} color={colors.textSecondary} />
              <Text style={styles.recHintText}>slide to cancel</Text>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Aa"
              placeholderTextColor={colors.textSecondary}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              onFocus={() => setShowEmoji(false)}
            />
            <TouchableOpacity
              style={styles.emojiToggle}
              onPress={() => setShowEmoji((v) => !v)}
            >
              <Ionicons
                name={showEmoji ? 'keypad-outline' : 'happy-outline'}
                size={20}
                color={showEmoji ? colors.primaryDark : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Right: send (typing) OR mic+thumbsup (idle/recording) */}
        {hasInput && !isRecording ? (
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="send" size={18} color={colors.textOnPrimary} />
          </TouchableOpacity>
        ) : (
          <>
            {/* Mic — always at same tree position; hold to record, swipe left to cancel */}
            <View
              style={[styles.micBtn, isRecording && styles.micBtnActive]}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                touchStartXRef.current = e.nativeEvent.pageX;
                startRecording();
              }}
              onResponderMove={(e) => {
                const dx = e.nativeEvent.pageX - touchStartXRef.current;
                if (dx < 0) {
                  swipeX.setValue(dx);
                  const del = dx < -70;
                  if (del !== swipeToDeleteRef.current) {
                    swipeToDeleteRef.current = del;
                    setSwipeToDelete(del);
                  }
                }
              }}
              onResponderRelease={() => {
                if (swipeToDeleteRef.current) {
                  cancelRecording();
                } else {
                  sendRecording();
                }
                swipeToDeleteRef.current = false;
                setSwipeToDelete(false);
              }}
              onResponderTerminate={() => {
                cancelRecording();
              }}
            >
              <Ionicons
                name={isRecording ? 'mic' : 'mic-outline'}
                size={24}
                color={isRecording ? '#E53E3E' : colors.primaryDark}
              />
            </View>
            {!isRecording && (
              <TouchableOpacity style={styles.iconBtn} onPress={handleSendLike}>
                <Ionicons name="thumbs-up" size={24} color={colors.primaryDark} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const AVATAR_SIZE = 30;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  list: { padding: 12, paddingBottom: 8, flexGrow: 1 },

  // Trade header
  tradeHeader: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tradeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tradeThumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: colors.borderLight,
    marginBottom: 7,
  },
  tradeThumbEmpty: { justifyContent: 'center', alignItems: 'center' },
  tradeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  tradeTitle: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'center' },
  tradeMeta: { fontSize: 11, color: colors.primaryDark, fontWeight: '700', marginTop: 2 },

  // Messages
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 3 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },

  avatarCol: { width: AVATAR_SIZE + 6, alignItems: 'center', justifyContent: 'flex-end' },
  msgAvatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: colors.borderLight },
  msgAvatarFallback: { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  msgAvatarInitial: { fontSize: 13, fontWeight: '700', color: colors.text },
  msgAvatarSpacer: { width: AVATAR_SIZE, height: AVATAR_SIZE },

  bubble: { paddingVertical: 9, paddingHorizontal: 14, maxWidth: '75%' },
  bubbleImage: { padding: 3, overflow: 'hidden' },
  bubbleMe: { backgroundColor: colors.primary },
  bubbleThem: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight },
  bubbleText: { fontSize: 15, color: colors.text, lineHeight: 20 },
  bubbleTextMe: { color: colors.textOnPrimary },
  msgImage: { width: 200, height: 200, borderRadius: 14 },
  time: { fontSize: 10, marginTop: 3, color: colors.textSecondary },
  timeMe: { color: 'rgba(45,52,54,0.6)', textAlign: 'right' },
  timeThem: { color: colors.textSecondary },

  emptyChat: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textSecondary, fontStyle: 'italic' },

  // Emoji panel
  emojiPanel: {
    height: 180,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  emojiItem: { width: '10%', alignItems: 'center', paddingVertical: 6 },
  emojiChar: { fontSize: 24 },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 4,
  },
  iconBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.background,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 38,
  },
  input: { flex: 1, fontSize: 15, color: colors.text, maxHeight: 100, paddingTop: 0, paddingBottom: 0 },
  emojiToggle: { paddingLeft: 6, paddingBottom: 2, justifyContent: 'flex-end' },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },

  // Mic button
  micBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  micBtnActive: { backgroundColor: 'rgba(229,83,83,0.12)' },

  // Recording inline UI (fits inside inputBar — same height)
  recSlide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  recTimer: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    minWidth: 38,
  },
  recDotsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  recDot: {
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  recHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  recHintText: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  // Audio bubble
  bubbleAudio: { paddingVertical: 10, paddingHorizontal: 12 },
  audioBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  audioWave: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 24 },
  audioBar: { width: 3, borderRadius: 2 },
});
