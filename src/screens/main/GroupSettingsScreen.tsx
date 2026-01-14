import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { groupService } from '../../services/group';
import { uploadService } from '../../services/upload';
import { Group, GroupMember } from '../../types';

const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
];

const PRIVACY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', icon: 'earth', description: 'Anyone can find and join' },
  { value: 'FRIENDS_ONLY', label: 'Friends Only', icon: 'account-group', description: 'Only friends can see' },
  { value: 'PRIVATE', label: 'Private', icon: 'lock', description: 'Invite-only' },
];

interface Props {
  route: any;
  navigation: any;
}

export default function GroupSettingsScreen({ route, navigation }: Props) {
  const { groupId } = route.params;
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedPrivacy, setSelectedPrivacy] = useState<'PUBLIC' | 'PRIVATE' | 'FRIENDS_ONLY'>('FRIENDS_ONLY');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  const loadGroup = async () => {
    try {
      const data = await groupService.getGroup(groupId);
      setGroup(data);
      setName(data.name);
      setDescription(data.description || '');
      setSelectedColor(data.color || COLOR_OPTIONS[0]);
      setSelectedPrivacy(data.privacy);
      setAvatarUrl(data.avatarUrl || null);
      setCoverImage(data.coverImage || null);
    } catch (error) {
      console.error('Failed to load group:', error);
      Alert.alert('Error', 'Failed to load group settings');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

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

  const handleRemoveAvatar = () => {
    Alert.alert('Remove Avatar', 'Remove group avatar?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setAvatarUrl(null) },
    ]);
  };

  const handleRemoveCover = () => {
    Alert.alert('Remove Cover', 'Remove cover image?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setCoverImage(null) },
    ]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setSaving(true);
    try {
      await groupService.updateGroup(groupId, {
        name: name.trim(),
        description: description.trim() || undefined,
        color: selectedColor,
        privacy: selectedPrivacy,
        avatarUrl: avatarUrl || undefined,
        coverImage: coverImage || undefined,
      });

      Alert.alert('Success', 'Group settings updated');
      navigation.goBack();
    } catch (error: any) {
      console.error('Failed to update group:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update group');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await groupService.deleteGroup(groupId);
              Alert.alert('Success', 'Group deleted');
              navigation.navigate('Groups');
            } catch (error: any) {
              console.error('Failed to delete group:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete group');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupService.leaveGroup(groupId);
              Alert.alert('Success', 'You left the group');
              navigation.navigate('Groups');
            } catch (error: any) {
              console.error('Failed to leave group:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to leave group');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const isAdmin = group?.currentUserRole === 'OWNER' || group?.currentUserRole === 'ADMIN';
  const isOwner = group?.currentUserRole === 'OWNER';

  // Non-admins get read-only view
  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Group Info</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Cover Image */}
          {coverImage && (
            <View style={styles.coverSection}>
              <Image source={{ uri: coverImage }} style={styles.coverImagePreview} />
            </View>
          )}

          {/* Group Avatar */}
          {avatarUrl && (
            <View style={styles.avatarSection}>
              <View style={[styles.avatarContainer, { borderColor: selectedColor }]}>
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              </View>
            </View>
          )}

          {/* Basic Info - Read Only */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Group Information</Text>
            
            <Text style={styles.label}>Group Name</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>{name}</Text>
            </View>

            {description && (
              <>
                <Text style={styles.label}>Description</Text>
                <View style={[styles.readOnlyField, styles.readOnlyFieldMultiline]}>
                  <Text style={styles.readOnlyText}>{description}</Text>
                </View>
              </>
            )}

            <Text style={styles.label}>Privacy</Text>
            <View style={styles.readOnlyField}>
              <MaterialCommunityIcons
                name={PRIVACY_OPTIONS.find(p => p.value === selectedPrivacy)?.icon || 'lock'}
                size={20}
                color="#6b7280"
              />
              <Text style={[styles.readOnlyText, { marginLeft: 8 }]}>
                {PRIVACY_OPTIONS.find(p => p.value === selectedPrivacy)?.label || selectedPrivacy}
              </Text>
            </View>

            <Text style={styles.label}>Member Count</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>{group?.memberCount || 0} members</Text>
            </View>
          </View>

          {/* Leave Group Option */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleLeaveGroup}
            >
              <MaterialCommunityIcons name="exit-to-app" size={24} color="#ef4444" />
              <View style={styles.actionButtonText}>
                <Text style={[styles.actionButtonTitle, styles.dangerText]}>Leave Group</Text>
                <Text style={styles.actionButtonSubtitle}>You can rejoin if invited again</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Admin view continues below

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Settings</Text>
        <TouchableOpacity
          style={[styles.saveButton, (!name.trim() || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!name.trim() || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Cover Image */}
        <View style={styles.coverSection}>
          <TouchableOpacity
            style={styles.coverImageContainer}
            onPress={handlePickCover}
            disabled={uploadingCover}
          >
            {coverImage ? (
              <Image source={{ uri: coverImage }} style={styles.coverImagePreview} />
            ) : (
              <View style={[styles.coverImagePlaceholder, { backgroundColor: selectedColor }]}>
                <MaterialCommunityIcons name="image-plus" size={32} color="#fff" />
                <Text style={styles.coverImageText}>Add Cover Image</Text>
              </View>
            )}
            {uploadingCover && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          {coverImage && (
            <TouchableOpacity style={styles.removeCoverBtn} onPress={handleRemoveCover}>
              <MaterialCommunityIcons name="close-circle" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Group Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={[styles.avatarContainer, { borderColor: selectedColor }]}
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: selectedColor + '20' }]}>
                <MaterialCommunityIcons name="camera-plus" size={32} color={selectedColor} />
              </View>
            )}
            {uploadingAvatar && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          {avatarUrl && (
            <TouchableOpacity style={styles.removeAvatarBtn} onPress={handleRemoveAvatar}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#ef4444" />
            </TouchableOpacity>
          )}
          <Text style={styles.avatarHint}>Tap to change group avatar</Text>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <Text style={styles.label}>Group Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter group name..."
            value={name}
            onChangeText={setName}
            maxLength={100}
            placeholderTextColor="#9ca3af"
          />

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
          <Text style={styles.sectionTitle}>Group Color</Text>
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

        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
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

        {/* Management Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Management</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('GroupMembers', { groupId, groupPrivacy: group?.privacy })}
          >
            <MaterialCommunityIcons name="account-multiple" size={24} color="#6366f1" />
            <View style={styles.actionButtonText}>
              <Text style={styles.actionButtonTitle}>Manage Members</Text>
              <Text style={styles.actionButtonSubtitle}>Add, remove, or change roles</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('GroupInvitations', { groupId })}
          >
            <MaterialCommunityIcons name="email-multiple" size={24} color="#6366f1" />
            <View style={styles.actionButtonText}>
              <Text style={styles.actionButtonTitle}>Pending Invitations</Text>
              <Text style={styles.actionButtonSubtitle}>View and manage invites</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
          
          {isOwner ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleDelete}
              disabled={deleting}
            >
              <MaterialCommunityIcons name="delete" size={24} color="#ef4444" />
              <View style={styles.actionButtonText}>
                <Text style={[styles.actionButtonTitle, styles.dangerText]}>Delete Group</Text>
                <Text style={styles.actionButtonSubtitle}>Permanently delete this group</Text>
              </View>
              {deleting && <ActivityIndicator size="small" color="#ef4444" />}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleLeaveGroup}
            >
              <MaterialCommunityIcons name="exit-to-app" size={24} color="#ef4444" />
              <View style={styles.actionButtonText}>
                <Text style={[styles.actionButtonTitle, styles.dangerText]}>Leave Group</Text>
                <Text style={styles.actionButtonSubtitle}>You can rejoin anytime</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
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
  saveButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  coverSection: {
    position: 'relative',
    backgroundColor: '#fff',
  },
  coverImageContainer: {
    width: '100%',
    height: 200,
  },
  coverImagePreview: {
    width: '100%',
    height: 200,
  },
  coverImagePlaceholder: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  removeCoverBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 4,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    marginTop: -48,
    position: 'relative',
    zIndex: 1,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeAvatarBtn: {
    position: 'absolute',
    top: 16,
    right: '50%',
    marginRight: -60,
  },
  avatarHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    color: '#1f2937',
  },
  readOnlyField: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  readOnlyFieldMultiline: {
    minHeight: 100,
    alignItems: 'flex-start',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#4b5563',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  selectedPrivacyOption: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  privacyOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  privacyOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  privacyLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  selectedPrivacyLabel: {
    color: '#6366f1',
  },
  privacyDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    marginBottom: 12,
  },
  actionButtonText: {
    flex: 1,
    marginLeft: 16,
  },
  actionButtonTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  actionButtonSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    lineHeight: 20,
  },
  dangerTitle: {
    color: '#ef4444',
  },
  dangerButton: {
    backgroundColor: '#fef2f2',
  },
  dangerText: {
    color: '#ef4444',
  },
});
