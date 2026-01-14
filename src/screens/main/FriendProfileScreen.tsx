import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memoryService } from '../../services/memory';
import { Memory } from '../../types';
import { api } from '../../services/api';
import { relationshipService, FriendRelationship } from '../../services/relationship';
import AssignRelationshipModal from '../../components/AssignRelationshipModal';

export default function FriendProfileScreen({ route, navigation }: any) {
  const { userId, userName } = route.params;
  const [friendData, setFriendData] = useState<any>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [relationships, setRelationships] = useState<FriendRelationship[]>([]);
  const [relationshipModalVisible, setRelationshipModalVisible] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadFriendData();
    loadMemories();
    loadRelationships();
    checkBlockStatus();
  }, [userId]);

  const checkBlockStatus = async () => {
    try {
      const status: any = await api.get(`/api/friends/block-status/${userId}`);
      setIsBlocked(status.isBlocked || false);
    } catch (error) {
      console.error('Error checking block status:', error);
    }
  };

  const loadFriendData = async () => {
    try {
      const user = await api.get(`/api/users/${userId}`);
      setFriendData(user);
    } catch (error) {
      console.error('Error loading friend data:', error);
    }
  };

  const loadRelationships = async () => {
    try {
      const data = await relationshipService.getFriendRelationships(userId);
      setRelationships(data);
    } catch (error) {
      console.error('Error loading relationships:', error);
    }
  };

  const loadMemories = async (pageNum = 1, refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else if (pageNum === 1) {
      setLoading(true);
    }

    try {
      // Use the correct backend route: /api/memories/user/:userId
      const response = await api.get(`/api/memories/user/${userId}`);
      const data = Array.isArray(response) ? response : [];
      
      if (refresh || pageNum === 1) {
        setMemories(data);
      } else {
        setMemories((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === 20);
      setPage(pageNum);
    } catch (error) {
      console.error('Load memories error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadFriendData();
    loadMemories(1, true);
    loadRelationships();
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadMemories(page + 1);
    }
  };

  const handleBlockUser = () => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block @${friendData?.username || userName}? They won't be able to see your profile or contact you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/api/friends/block/${userId}`);
              setIsBlocked(true);
              Alert.alert('Blocked', 'User has been blocked successfully');
              navigation.goBack();
            } catch (error: any) {
              console.error('Block error:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to block user');
            }
          },
        },
      ]
    );
  };

  const handleReportUser = () => {
    Alert.alert(
      'Report User',
      'What would you like to report?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Spam', onPress: () => submitReport('spam') },
        { text: 'Harassment', onPress: () => submitReport('harassment') },
        { text: 'Inappropriate Content', onPress: () => submitReport('inappropriate') },
        { text: 'Other', onPress: () => submitReport('other') },
      ]
    );
  };

  const submitReport = async (reason: string) => {
    Alert.alert(
      'Report Submitted',
      'Thank you for your report. We will review it shortly.',
      [{ text: 'OK' }]
    );
    // TODO: Implement actual reporting endpoint
    console.log(`Report submitted for user ${userId}: ${reason}`);
  };

  const showMoreOptions = () => {
    Alert.alert(
      'More Options',
      'Choose an action',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block User',
          style: 'destructive',
          onPress: handleBlockUser,
        },
        {
          text: 'Report User',
          onPress: handleReportUser,
        },
      ]
    );
  };

  const handleMessageFriend = () => {
    navigation.navigate('DirectMessage', { userId, userName: friendData?.username || userName });
  };

  const handleRelationshipUpdate = () => {
    loadRelationships();
  };

  const renderRelationships = () => {
    if (relationships.length === 0) return null;

    return (
      <View style={styles.relationshipsSection}>
        <Text style={styles.relationshipsTitle}>How you know them:</Text>
        <View style={styles.relationshipChips}>
          {relationships.map((rel) => (
            <View key={rel.id} style={styles.relationshipChip}>
              <Text style={styles.relationshipText}>
                {rel.category?.name}
                {rel.subcategory && ` → ${rel.subcategory.name}`}
                {rel.detail && ` → ${rel.detail.name}`}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderMemoryCard = ({ item }: { item: Memory }) => (
    <TouchableOpacity 
      style={styles.memoryCard}
      onPress={() => navigation.navigate('MemoryDetail', { memoryId: item.id })}
    >
      <View style={styles.memoryHeader}>
        <View style={styles.userInfo}>
          {friendData?.profilePicture ? (
            <Image source={{ uri: friendData.profilePicture }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="account" size={24} color="#6366f1" />
            </View>
          )}
          <View>
            <Text style={styles.username}>
              {friendData?.displayName || friendData?.username || userName}
            </Text>
            <Text style={styles.timestamp}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      {item.title && <Text style={styles.title}>{item.title}</Text>}
      <Text style={styles.content} numberOfLines={4}>
        {item.content}
      </Text>

      {item.moods && item.moods.length > 0 && (
        <View style={styles.moods}>
          {item.moods.map((mood, index) => (
            <Text key={index} style={styles.mood}>
              {mood}
            </Text>
          ))}
        </View>
      )}

      {item.categories && item.categories.length > 0 && (
        <View style={styles.categories}>
          {item.categories.map((category) => (
            <View
              key={category.id}
              style={[styles.categoryBadge, { borderLeftColor: category.color }]}
            >
              <Text style={styles.categoryText}>{category.name}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <View style={styles.actionButton}>
          <MaterialCommunityIcons name="comment-outline" size={20} color="#6b7280" />
          <Text style={styles.actionText}>{item._count?.comments || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="timeline-text-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyTitle}>No memories shared</Text>
      <Text style={styles.emptyText}>No visible memories from this friend yet</Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.profileHeader}>
      {friendData?.profilePicture ? (
        <Image source={{ uri: friendData.profilePicture }} style={styles.profileAvatar} />
      ) : (
        <View style={[styles.profileAvatar, styles.profileAvatarPlaceholder]}>
          <MaterialCommunityIcons name="account" size={48} color="#6366f1" />
        </View>
      )}
      <Text style={styles.profileName}>
        {friendData?.displayName || friendData?.username || userName}
      </Text>
      {friendData?.bio && (
        <Text style={styles.profileBio}>{friendData.bio}</Text>
      )}
      {renderRelationships()}
      <View style={styles.profileActions}>
        <TouchableOpacity style={styles.messageButton} onPress={handleMessageFriend}>
          <MaterialCommunityIcons name="message" size={20} color="white" />
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quizButton}
          onPress={() => navigation.navigate('TakeFriendQuiz', { 
            userId: friendData.id,
            userName: friendData.username 
          })}
        >
          <MaterialCommunityIcons name="head-question-outline" size={20} color="#f59e0b" />
          <Text style={styles.quizButtonText}>Quiz</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.relationshipButton}
          onPress={() => setRelationshipModalVisible(true)}
        >
          <MaterialCommunityIcons name="tag-outline" size={20} color="#6366f1" />
          <Text style={styles.relationshipButtonText}>Relationship</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Shared Memories</Text>
    </View>
  );

  if (loading && page === 1 && !friendData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friend Profile</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={showMoreOptions}
        >
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={memories}
        renderItem={renderMemoryCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={loading ? null : renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && page > 1 ? (
            <ActivityIndicator style={styles.footerLoader} color="#6366f1" />
          ) : null
        }
      />

      <AssignRelationshipModal
        visible={relationshipModalVisible}
        friendId={userId}
        friendName={friendData?.username || userName}
        currentRelationships={relationships}
        onClose={() => setRelationshipModalVisible(false)}
        onRelationshipAssigned={handleRelationshipUpdate}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  backButton: {
    padding: 4,
    width: 32,
  },
  profileHeader: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  profileAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
  },
  profileAvatarPlaceholder: {
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  profileBio: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  relationshipsSection: {
    marginTop: 8,
    marginBottom: 16,
    alignSelf: 'stretch',
  },
  relationshipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  relationshipChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relationshipChip: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  relationshipText: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '500',
  },
  profileActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  messageButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  quizButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  quizButtonText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '600',
  },
  relationshipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  relationshipButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  listContent: {
    paddingBottom: 16,
  },
  memoryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  memoryHeader: {
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  content: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  moods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  mood: {
    fontSize: 20,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  categoryBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4b5563',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  footerLoader: {
    marginVertical: 16,
  },
});
