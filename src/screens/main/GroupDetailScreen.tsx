import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { groupService } from '../../services/group';
import { memoryService } from '../../services/memory';
import { useGroupDetail, useGroupMemories, useInvalidateGroups } from '../../hooks/useQueries';
import { Group, Memory } from '../../types';

interface Props {
  route: any;
  navigation: any;
}

export default function GroupDetailScreen({ route, navigation }: Props) {
  const { groupId } = route.params;
  const [activeTab, setActiveTab] = useState<'memories' | 'members' | 'chat'>('memories');
  const invalidateGroups = useInvalidateGroups();

  // Fetch group details with React Query
  const { data: group, isLoading: loadingGroup, refetch: refetchGroup, isRefetching } = useGroupDetail(groupId);
  
  // Only fetch memories if user is a member
  const { data: memoriesResponse, isLoading: loadingMemories } = useGroupMemories(
    groupId,
    1,
    20
  );
  
  const memories = Array.isArray(memoriesResponse) ? memoriesResponse : memoriesResponse?.data || [];
  const loading = loadingGroup || loadingMemories;

  const onRefresh = () => {
    refetchGroup();
  };

  const openChat = () => {
    navigation.navigate('GroupChat', { groupId, groupName: group?.name });
  };

  const handleInvite = () => {
    navigation.navigate('GroupMembers', { groupId, groupPrivacy: group?.privacy });
  };

  const handleJoinGroup = async () => {
    try {
      await groupService.joinGroup(groupId);
      invalidateGroups(); // Invalidate cache to refetch updated group data
      refetchGroup(); // Refetch this specific group
      Alert.alert('Success', 'You have joined the group!');
    } catch (error: any) {
      console.error('Error joining group:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to join group');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Group not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{group.name}</Text>
        <TouchableOpacity 
          style={styles.moreButton}
          onPress={() => navigation.navigate('GroupSettings', { groupId: group.id })}
        >
          <MaterialCommunityIcons name="cog" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
      >
        {/* Cover Image */}
        {group.coverImage ? (
          <Image source={{ uri: group.coverImage }} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverImage, { backgroundColor: group.color || '#6366f1' }]}>
            <MaterialCommunityIcons name="image-outline" size={48} color="rgba(255,255,255,0.3)" />
          </View>
        )}

        {/* Group Avatar */}
        {group.avatarUrl && (
          <View style={styles.avatarContainer}>
            <Image source={{ uri: group.avatarUrl }} style={styles.groupAvatar} />
          </View>
        )}

        {/* Group Info */}
        <View style={[styles.infoSection, group.avatarUrl && styles.infoSectionWithAvatar]}>
          <Text style={styles.groupName}>{group.name}</Text>
          {group.description && (
            <Text style={styles.description}>{group.description}</Text>
          )}

          <View style={styles.stats}>
            <View style={styles.stat}>
              <MaterialCommunityIcons name="account-group" size={20} color="#6b7280" />
              <Text style={styles.statText}>{group.memberCount} members</Text>
            </View>
            <View style={styles.stat}>
              <MaterialCommunityIcons name="earth" size={20} color="#6b7280" />
              <Text style={styles.statText}>{group.privacy}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {group.isMember ? (
            <>
              <TouchableOpacity style={styles.primaryButton} onPress={openChat}>
                <MaterialCommunityIcons name="message-text" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleInvite}>
                <MaterialCommunityIcons name="account-plus" size={20} color="#6366f1" />
                <Text style={styles.secondaryButtonText}>Invite</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.joinButton} onPress={handleJoinGroup}>
              <MaterialCommunityIcons name="account-plus" size={20} color="#fff" />
              <Text style={styles.joinButtonText}>Join Group</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Only show tabs if user is a member */}
        {group.isMember && (
          <>
            {/* Tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'memories' && styles.activeTab]}
                onPress={() => setActiveTab('memories')}
              >
                <Text style={[styles.tabText, activeTab === 'memories' && styles.activeTabText]}>
                  Memories
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'members' && styles.activeTab]}
                onPress={() => setActiveTab('members')}
              >
                <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>
                  Members
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {activeTab === 'memories' && (
          <View style={styles.memoriesSection}>
            {memories.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="camera-off" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No memories yet</Text>
                <Text style={styles.emptySubtext}>
                  Be the first to share a memory in this group!
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionButton}
                  onPress={() => navigation.navigate('CreateMemory', { groupId: group.id, groupName: group.name })}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                  <Text style={styles.emptyActionButtonText}>Create Memory</Text>
                </TouchableOpacity>
              </View>
            ) : (
              memories.map((memory) => (
                <TouchableOpacity
                  key={memory.id}
                  style={styles.memoryCard}
                  onPress={() => navigation.navigate('MemoryDetail', { memoryId: memory.id })}
                >
                  {memory.photos && memory.photos.length > 0 && (
                    <Image source={{ uri: memory.photos[0] }} style={styles.memoryImage} />
                  )}
                  <View style={styles.memoryContent}>
                    {memory.title && <Text style={styles.memoryTitle}>{memory.title}</Text>}
                    <Text style={styles.memoryText} numberOfLines={2}>
                      {memory.content}
                    </Text>
                    
                    {memory.categories && memory.categories.length > 0 && (
                      <View style={styles.memoryTags}>
                        {memory.categories.map((category) => (
                          <View
                            key={category.id}
                            style={[styles.categoryBadge, { borderLeftColor: category.color }]}
                          >
                            <Text style={styles.categoryText}>{category.name}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    {memory.moods && memory.moods.length > 0 && (
                      <View style={styles.memoryTags}>
                        {memory.moods.map((mood, index) => (
                          <View key={index} style={styles.tagBadge}>
                            <Text style={styles.tagText}>#{mood}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    
                    <Text style={styles.memoryDate}>
                      {new Date(memory.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

            {activeTab === 'members' && (
              <View style={styles.membersSection}>
                {group.members && group.members.length > 0 ? (
                  group.members.map((member) => (
                    <View key={member.id} style={styles.memberItem}>
                      <View style={styles.memberAvatar}>
                        {member.user?.profilePicture ? (
                          <Image
                            source={{ uri: member.user.profilePicture }}
                            style={styles.memberAvatarImage}
                          />
                        ) : (
                          <MaterialCommunityIcons name="account-circle" size={40} color="#ccc" />
                        )}
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>
                          {member.user?.name || member.user?.username || 'Unknown User'}
                        </Text>
                        <Text style={styles.memberRole}>{member.role}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    {group.privacy === 'PUBLIC' ? (
                      <>
                        <MaterialCommunityIcons name="shield-lock" size={48} color="#9ca3af" />
                        <Text style={styles.emptyText}>Member list is private</Text>
                        <Text style={styles.emptySubtext}>Only admins can view members in public groups</Text>
                      </>
                    ) : (
                      <Text style={styles.emptyText}>No members to display</Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Action Button - Only for members */}
      {group.isMember && activeTab === 'memories' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateMemory', { groupId: group.id, groupName: group.name })}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: 48,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  moreButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  coverImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'absolute',
    top: 140,
    left: 16,
    zIndex: 1,
  },
  groupAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
  },
  infoSection: {
    padding: 16,
  },
  infoSectionWithAvatar: {
    paddingTop: 56,
  },
  groupName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 20,
  },
  stats: {
    flexDirection: 'row',
    gap: 28,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280',
  },
  activeTabText: {
    color: '#6366f1',
    fontWeight: '600',
  },
  memoriesSection: {
    padding: 16,
  },
  memoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  memoryImage: {
    width: '100%',
    height: 200,
  },
  memoryContent: {
    padding: 12,
  },
  memoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  memoryText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  memoryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#f9fafb',
    borderLeftWidth: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  tagBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  memoryDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  membersSection: {
    padding: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  memberAvatar: {
    marginRight: 12,
  },
  memberAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  memberRole: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
    gap: 8,
  },
  emptyActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
