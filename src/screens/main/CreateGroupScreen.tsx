import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { groupService } from '../../services/group';
import { uploadService } from '../../services/upload';

const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
];

const PRIVACY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', icon: 'earth', description: 'Anyone can find and join' },
  { value: 'FRIENDS_ONLY', label: 'Friends Only', icon: 'account-group', description: 'Only friends can see' },
  { value: 'PRIVATE', label: 'Private', icon: 'lock', description: 'Invite-only, hidden from search' },
];

export default function CreateGroupScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedPrivacy, setSelectedPrivacy] = useState<'PUBLIC' | 'PRIVATE' | 'FRIENDS_ONLY'>('FRIENDS_ONLY');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadingAvatar(true);
      try {
        const uploaded = await uploadService.uploadPhoto(result.assets[0].uri);
        setAvatarUrl(uploaded.url);
      } catch (error) {
        console.error('Failed to upload avatar:', error);
        Alert.alert('Error', 'Failed to upload avatar');
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handlePickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadingCover(true);
      try {
        const uploaded = await uploadService.uploadPhoto(result.assets[0].uri);
        setCoverImage(uploaded.url);
      } catch (error) {
        console.error('Failed to upload cover:', error);
        Alert.alert('Error', 'Failed to upload cover image');
      } finally {
        setUploadingCover(false);
      }
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setLoading(true);
    try {
      const newGroup = await groupService.createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        color: selectedColor,
        privacy: selectedPrivacy,
        avatarUrl: avatarUrl || undefined,
        coverImage: coverImage || undefined,
      });

      Alert.alert('Success', 'Group created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.replace('GroupDetail', { groupId: newGroup.id });
          },
        },
      ]);
    } catch (error: any) {
      console.error('Create group error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Group</Text>
        <TouchableOpacity
          style={[styles.createButton, (!name.trim() || loading) && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={!name.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Cover Image */}
        <TouchableOpacity
          style={styles.coverUpload}
          onPress={handlePickCover}
          disabled={uploadingCover}
        >
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.coverPreview} />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: selectedColor }]}>
              <MaterialCommunityIcons name="image-plus" size={32} color="#fff" />
              <Text style={styles.coverPlaceholderText}>Add Cover Image (Optional)</Text>
            </View>
          )}
          {uploadingCover && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Group Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={[styles.avatarUpload, { borderColor: selectedColor }]}
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarPreview} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: selectedColor + '20' }]}>
                <MaterialCommunityIcons name="camera-plus" size={32} color={selectedColor} />
              </View>
            )}
            {uploadingAvatar && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Optional: Add group avatar</Text>
        </View>

        {/* Name Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Group Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter group name..."
            value={name}
            onChangeText={setName}
            maxLength={100}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Description Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What's this group about?"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
            placeholderTextColor="#9ca3af"
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* Color Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Group Color</Text>
          <View style={styles.colorOptions}>
            {COLOR_OPTIONS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.selectedColorOption,
                ]}
                onPress={() => setSelectedColor(color)}
              >
                {selectedColor === color && (
                  <MaterialCommunityIcons name="check" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Privacy Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Privacy</Text>
          {PRIVACY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.privacyOption,
                selectedPrivacy === option.value && styles.selectedPrivacyOption,
              ]}
              onPress={() => setSelectedPrivacy(option.value as any)}
            >
              <View style={styles.privacyOptionLeft}>
                <MaterialCommunityIcons
                  name={option.icon}
                  size={24}
                  color={selectedPrivacy === option.value ? '#6366f1' : '#6b7280'}
                />
                <View style={styles.privacyOptionText}>
                  <Text
                    style={[
                      styles.privacyLabel,
                      selectedPrivacy === option.value && styles.selectedPrivacyLabel,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.privacyDescription}>{option.description}</Text>
                </View>
              </View>
              {selectedPrivacy === option.value && (
                <MaterialCommunityIcons name="check-circle" size={24} color="#6366f1" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  createButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  coverUpload: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 80,
  },
  coverPreview: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  coverPlaceholderText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: -60,
    marginBottom: 24,
  },
  avatarUpload: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarPreview: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
  },
  section: {
    marginBottom: 28,
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 17,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorOption: {
    borderColor: '#1f2937',
    borderWidth: 3,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedPrivacyOption: {
    borderColor: '#6366f1',
    backgroundColor: '#ede9fe',
  },
  privacyOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  privacyOptionText: {
    flex: 1,
  },
  privacyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  selectedPrivacyLabel: {
    color: '#6366f1',
  },
  privacyDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
});
