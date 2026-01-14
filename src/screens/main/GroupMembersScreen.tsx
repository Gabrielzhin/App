import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { groupService } from '../../services/group';
import { friendService, Friendship } from '../../services/friend';
import { GroupMember } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  route: any;
  navigation: any;
}

export default function GroupMembersScreen({ route, navigation }: Props) {
  const { groupId, groupPrivacy } = route.params;
  const { user } = useAuth();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [groupId]);

  const loadMembers = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await groupService.getMembers(groupId);
      setMembers(data);
    } catch (error) {
      console.error('Failed to load members:', error);
      Alert.alert('Error', 'Failed to load group members');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadMembers(true);
  };

  const handleOpenInvite = async () => {
    setShowInviteModal(true);
    try {
      const friendsList = await friendService.getFriends();
      const acceptedFriends = friendsList.filter(f => f.status === 'ACCEPTED');
      
      // Filter out friends who are already members
      const memberUserIds = members.map(m => m.userId);
      const availableFriends = acceptedFriends.filter(
        f => !memberUserIds.includes(f.friend?.id || f.user?.id || '')
      );
      
      setFriends(availableFriends);
    } catch (error) {
      console.error('Failed to load friends:', error);
      Alert.alert('Error', 'Failed to load friends');
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const handleInvite = async () => {
    if (selectedFriends.length === 0) {
      Alert.alert('Error', 'Please select at least one friend');
      return;
    }

    setInviting(true);
    try {
      for (const friendId of selectedFriends) {
        await groupService.inviteMember(groupId, friendId);
      }

      setShowInviteModal(false);
      setSelectedFriends([]);
      Alert.alert('Success', `Invited ${selectedFriends.length} friend(s) to the group`);
      loadMembers();
    } catch (error: any) {
      console.error('Failed to invite members:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to send invitations');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = (member: GroupMember) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.user?.username || 'this member'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // You'd need to add this endpoint
              await groupService.removeMember(groupId, member.userId);
              Alert.alert('Success', 'Member removed');
              loadMembers();
            } catch (error: any) {
              console.error('Failed to remove member:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const handleChangeRole = (member: GroupMember) => {
    const newRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    Alert.alert(
      'Change Role',
      `Change ${member.user?.username || 'this member'}'s role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            try {
              // You'd need to add this endpoint
              await groupService.updateMemberRole(groupId, member.userId, newRole);
              Alert.alert('Success', 'Role updated');
              loadMembers();
            } catch (error: any) {
              console.error('Failed to update role:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to update role');
            }
          },
        },
      ]
    );
  };

  const renderMemberItem = ({ item }: { item: GroupMember }) => {
    const isCurrentUser = item.userId === user?.id;
    const canManage = !isCurrentUser; // You'd check if current user is admin

    return (
      <View style={styles.memberItem}>
        <View style={styles.memberLeft}>
          {item.user?.profilePicture ? (
            <Image
              source={{ uri: item.user.profilePicture }}
              style={styles.memberAvatar}
            />
          ) : (
            <View style={styles.memberAvatarPlaceholder}>
              <Text style={styles.memberAvatarText}>
                {item.user?.username?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>
              {item.user?.displayName || item.user?.username || 'Unknown User'}
              {isCurrentUser && <Text style={styles.youBadge}> (You)</Text>}
            </Text>
            <View style={styles.memberMeta}>
              <View style={[styles.roleBadge, item.role === 'OWNER' && styles.ownerBadge]}>
                <Text style={[styles.roleText, item.role === 'OWNER' && styles.ownerText]}>
                  {item.role}
                </Text>
              </View>
              <Text style={styles.joinedText}>
                Joined {new Date(item.joinedAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {canManage && item.role !== 'OWNER' && (
          <View style={styles.memberActions}>
            <TouchableOpacity
              style={styles.actionIcon}
              onPress={() => handleChangeRole(item)}
            >
              <MaterialCommunityIcons name="shield-account" size={20} color="#6366f1" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionIcon}
              onPress={() => handleRemoveMember(item)}
            >
              <MaterialCommunityIcons name="account-remove" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Members ({members.length})</Text>
        <TouchableOpacity style={styles.inviteButton} onPress={handleOpenInvite}>
          <MaterialCommunityIcons name="account-plus" size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={members}
        renderItem={renderMemberItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {groupPrivacy === 'PUBLIC' ? (
              <>
                <MaterialCommunityIcons name="shield-lock" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>Member list is private</Text>
                <Text style={styles.emptySubtext}>Only admins can view the full member list in public groups</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="account-group-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>No members yet</Text>
                <Text style={styles.emptySubtext}>Invite friends to join this group</Text>
              </>
            )}
          </View>
        }
      />

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Friends</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {friends.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="account-off" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No friends available to invite</Text>
                <Text style={styles.emptySubtext}>
                  All your friends are already members
                </Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={friends}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    const friend = item.friend || item.user;
                    const isSelected = selectedFriends.includes(friend.id);
                    return (
                      <TouchableOpacity
                        style={styles.friendItem}
                        onPress={() => toggleFriendSelection(friend.id)}
                      >
                        <View style={styles.friendInfo}>
                          {friend.profilePicture ? (
                            <Image
                              source={{ uri: friend.profilePicture }}
                              style={styles.friendAvatar}
                            />
                          ) : (
                            <View style={styles.friendAvatarPlaceholder}>
                              <Text style={styles.friendAvatarText}>
                                {friend.username?.[0]?.toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <Text style={styles.friendName}>
                            {friend.displayName || friend.username}
                          </Text>
                        </View>
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                          {isSelected && <MaterialCommunityIcons name="check" size={16} color="#fff" />}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />

                <TouchableOpacity
                  style={[styles.inviteBtn, inviting && styles.inviteBtnDisabled]}
                  onPress={handleInvite}
                  disabled={inviting || selectedFriends.length === 0}
                >
                  <Text style={styles.inviteBtnText}>
                    {inviting
                      ? 'Sending...'
                      : `Invite ${selectedFriends.length > 0 ? selectedFriends.length : ''} Friend${selectedFriends.length !== 1 ? 's' : ''}`}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  inviteButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  memberAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  youBadge: {
    fontSize: 14,
    color: '#6366f1',
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  roleBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ownerBadge: {
    backgroundColor: '#eef2ff',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  ownerText: {
    color: '#6366f1',
  },
  joinedText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIcon: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  friendName: {
    fontSize: 16,
    color: '#1f2937',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  inviteBtn: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  inviteBtnDisabled: {
    opacity: 0.5,
  },
  inviteBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
