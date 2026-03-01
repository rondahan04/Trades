/**
 * Edit Profile screen – Nano Banana theme.
 * Profile picture (camera/gallery), display name, bio, location. Save calls updateUserProfile.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useAuth } from '../contexts';
import { updateUserProfile } from '../services/dbService';
import { isFirebaseEnabled } from '../config/firebase';

export function EditProfileScreen() {
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState((user as { bio?: string })?.bio ?? '');
  const [location, setLocation] = useState((user as { location?: string })?.location ?? '');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [profileImageBase64, setProfileImageBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const requestMediaPermission = async (mediaType: 'camera' | 'library') => {
    if (mediaType === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  const handleTakePhoto = async () => {
    const ok = await requestMediaPermission('camera');
    if (!ok) {
      Alert.alert('Permission needed', 'Camera access is required to take a profile photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setProfileImageUri(asset.uri);
      setProfileImageBase64(asset.base64 ?? null);
    }
  };

  const handleChooseFromGallery = async () => {
    const ok = await requestMediaPermission('library');
    if (!ok) {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setProfileImageUri(asset.uri);
      setProfileImageBase64(asset.base64 ?? null);
    }
  };

  const handleChangePhoto = () => {
    Alert.alert('Profile picture', 'Choose an option', [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Gallery', onPress: handleChooseFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be signed in to update your profile.');
      return;
    }
    if (!isFirebaseEnabled()) {
      Alert.alert('Firebase not configured', 'Profile cannot be saved without Firebase.');
      return;
    }
    setSaving(true);
    try {
      const result = await updateUserProfile(
        {
          displayName: displayName.trim() || user.displayName,
          bio: bio.trim() || null,
          location: location.trim() || null,
        },
        profileImageUri,
        profileImageBase64
      );
      await refreshUser();
      if (result?.pictureUploadFailed) {
        Alert.alert(
          'Saved',
          'Profile updated, but the photo could not be uploaded. Check your network or try again.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Saved', 'Your profile has been updated.', [
          { text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save profile';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const photoSource = profileImageUri ?? user?.avatarUrl;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.avatarWrap} onPress={handleChangePhoto}>
          {photoSource ? (
            <Image source={{ uri: photoSource }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={48} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.avatarBadge}>
            <Ionicons name="camera" size={18} color={colors.textOnPrimary} />
          </View>
        </TouchableOpacity>
        <Text style={styles.hint}>Tap to change photo</Text>

        <Text style={styles.label}>Display name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={colors.textSecondary}
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={50}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="A short bio..."
          placeholderTextColor={colors.textSecondary}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          maxLength={300}
        />

        <Text style={styles.label}>General location</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Tel Aviv"
          placeholderTextColor={colors.textSecondary}
          value={location}
          onChangeText={setLocation}
          maxLength={80}
        />

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <Text style={styles.saveButtonText}>Save Profile</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  avatarWrap: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  saveDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
});
