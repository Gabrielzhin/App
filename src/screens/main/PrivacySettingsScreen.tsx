import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

type ProfileVisibility = 'PUBLIC' | 'FRIENDS_ONLY' | 'PRIVATE';

interface BlockedUser {
  blockId: string;
  user: {
    id: string;
    name: string;
    username: string;
    profilePicture?: string;
  };
  blockedAt: string;
}

export default function PrivacySettingsScreen({ navigation }: any) {
  const { user, refreshUser } = useAuth();
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>(
    (user?.profileVisibility as ProfileVisibility) || 'FRIENDS_ONLY'
  );
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [blockedLoading, setBlockedLoading] = useState(true);

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    setBlockedLoading(true);
    try {
      const response = await api.get<{ blockedUsers: BlockedUser[] }>('/api/friends/blocked');
      setBlockedUsers(response.blockedUsers || []);
    } catch (error: any) {
      console.error('Failed to load blocked users:', error);
    } finally {
      setBlockedLoading(false);
    }
  };

  const updatePrivacySettings = async (newVisibility: ProfileVisibility) => {
    setLoading(true);
    try {
      await api.put('/api/users/privacy', {
        profileVisibility: newVisibility,
      });
      setProfileVisibility(newVisibility);
      await refreshUser();
      Alert.alert('Success', 'Privacy settings updated');
    } catch (error: any) {
      console.error('Failed to update privacy:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId: string, username: string) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock @${username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              await api.delete(`/api/friends/block/${userId}`);
              await loadBlockedUsers();
              Alert.alert('Success', `@${username} has been unblocked`);
            } catch (error: any) {
              console.error('Failed to unblock user:', error);
              Alert.alert('Error', 'Failed to unblock user');
            }
          },
        },
      ]
    );
  };

  const VisibilityOption = ({
    value,
    title,
    description,
    icon,
  }: {
    value: ProfileVisibility;
    title: string;
    description: string;
    icon: string;
  }) => {
    const isSelected = profileVisibility === value;

    return (
      <TouchableOpacity
        style={[styles.optionCard, isSelected && styles.optionCardSelected]}
        onPress={() => updatePrivacySettings(value)}
        disabled={loading}
      >
        <View style={styles.optionIcon}>
          <MaterialCommunityIcons name={icon} size={28} color={isSelected ? '#007AFF' : '#666'} />
        </View>
        <View style={styles.optionContent}>
          <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
            {title}
          </Text>
          <Text style={styles.optionDescription}>{description}</Text>
        </View>
        {isSelected && (
          <MaterialCommunityIcons name="check-circle" size={24} color="#007AFF" />
        )}
      </TouchableOpacity>
    );
  };

  const BlockedUserItem = ({ item }: { item: BlockedUser }) => (
    <View style={styles.blockedUserCard}>
      <View style={styles.blockedUserInfo}>
        {item.user.profilePicture ? (
          <Image
            source={{ uri: item.user.profilePicture }}
            style={styles.blockedUserAvatar}
          />
        ) : (
          <View style={[styles.blockedUserAvatar, styles.blockedUserAvatarPlaceholder]}>
            <MaterialCommunityIcons name="account" size={24} color="#999" />
          </View>
        )}
        <View style={styles.blockedUserDetails}>
          <Text style={styles.blockedUserName}>{item.user.name || 'User'}</Text>
          <Text style={styles.blockedUserUsername}>@{item.user.username}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.unblockButton}
        onPress={() => handleUnblock(item.user.id, item.user.username)}
      >
        <Text style={styles.unblockButtonText}>Unblock</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Safety</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Privacy</Text>
          <Text style={styles.sectionDescription}>
            Control who can see your profile and memories
          </Text>

          <VisibilityOption
            value="PRIVATE"
            title="Private"
            description="Only you can see your profile and memories. Others must send a friend request."
            icon="lock"
          />

          <VisibilityOption
            value="FRIENDS_ONLY"
            title="Friends Only"
            description="Only your friends can see your profile and memories. This is the recommended setting."
            icon="account-group"
          />

          <VisibilityOption
            value="PUBLIC"
            title="Public"
            description="Everyone can see your profile and public memories. Your profile appears in search results."
            icon="earth"
          />

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          )}
        </View>

        {/* Memory Privacy Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Memory Privacy</Text>
          <Text style={styles.sectionDescription}>
            When creating a memory, you can choose who sees it:
          </Text>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="lock" size={20} color="#ef4444" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Private</Text>
              <Text style={styles.infoDescription}>Only you can see it</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="account-multiple" size={20} color="#f59e0b" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Only Tagged</Text>
              <Text style={styles.infoDescription}>Only people you tag can see it</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="account-group" size={20} color="#3b82f6" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Friends</Text>
              <Text style={styles.infoDescription}>All your friends can see it</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="earth" size={20} color="#10b981" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Public</Text>
              <Text style={styles.infoDescription}>
                Everyone can see it (requires public account)
              </Text>
            </View>
          </View>
        </View>

        {/* Blocked Users Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Blocked Users</Text>
            {blockedUsers.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{blockedUsers.length}</Text>
              </View>
            )}
          </View>
          <Text style={styles.sectionDescription}>
            Blocked users cannot see your profile or interact with you
          </Text>

          {blockedLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#666" />
              <Text style={styles.loadingText}>Loading blocked users...</Text>
            </View>
          ) : blockedUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-off" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No blocked users</Text>
            </View>
          ) : (
            <View style={styles.blockedUsersList}>
              {blockedUsers.map(item => (
                <BlockedUserItem key={item.blockId} item={item} />
              ))}
            </View>
          )}
        </View>

        {/* Safety Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Tips</Text>
          <View style={styles.tipCard}>
            <MaterialCommunityIcons name="shield-check" size={24} color="#10b981" />
            <View style={styles.tipContent}>
              <Text style={styles.tipText}>
                • Keep your account private or friends-only for better privacy{'\n'}
                • Only accept friend requests from people you know{'\n'}
                • Report suspicious or abusive behavior{'\n'}
                • Block users who make you uncomfortable{'\n'}
                • Review your privacy settings regularly
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  optionCardSelected: {
    backgroundColor: '#e0f2fe',
    borderColor: '#007AFF',
  },
  optionIcon: {
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  optionTitleSelected: {
    color: '#007AFF',
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  infoDescription: {
    fontSize: 13,
    color: '#666',
  },
  blockedUsersList: {
    gap: 12,
  },
  blockedUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  blockedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  blockedUserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  blockedUserAvatarPlaceholder: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockedUserDetails: {
    flex: 1,
  },
  blockedUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  blockedUserUsername: {
    fontSize: 14,
    color: '#666',
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
  },
  unblockButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  badge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    gap: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 20,
  },
});
