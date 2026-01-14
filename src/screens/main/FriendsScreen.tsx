import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { friendService, Friendship, FriendRequest } from '../../services/friend';
import { User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

type TabType = 'friends' | 'requests' | 'sent';

export default function FriendsScreen({ navigation }: any) {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [friendsData, requestsData, sentData] = await Promise.all([
        friendService.getFriends().catch(() => []),
        friendService.getPendingRequests().catch(() => []),
        friendService.getSentRequests().catch(() => []),
      ]);
      console.log('📊 Friends data loaded:', { 
        friends: friendsData.length, 
        requests: requestsData.length, 
        sent: sentData.length 
      });
      console.log('👥 Friends sample:', friendsData[0]);
      setFriends(friendsData);
      setPendingRequests(requestsData);
      setSentRequests(sentData);
    } catch (error: any) {
      console.error('Error loading friends data:', error);
      if (error.response?.status === 404) {
        Alert.alert(
          'Backend Not Ready',
          'Friend routes are not implemented yet on the backend. Please implement the friend API endpoints.'
        );
      } else {
        Alert.alert('Error', 'Failed to load friends');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setSearching(true);
      const results = await friendService.searchUsers(searchQuery.trim());
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await friendService.sendFriendRequest(userId);
      Alert.alert('Success', 'Friend request sent!');
      setSearchModalVisible(false);
      setSearchQuery('');
      setSearchResults([]);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      await friendService.acceptFriendRequest(friendshipId);
      Alert.alert('Success', 'Friend request accepted!');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    try {
      await friendService.rejectFriendRequest(friendshipId);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to reject friend request');
    }
  };

  const handleRemoveFriend = async (friendshipId: string, friendName: string) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await friendService.removeFriend(friendshipId);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  const handleMessageFriend = (friend: User) => {
    navigation.navigate('DirectMessage', { userId: friend.id, userName: friend.username });
  };

  const renderFriendItem = ({ item }: { item: Friendship }) => {
    // Determine which user object is the friend (not the current user)
    const friend = item.userId === currentUser?.id ? item.friend : item.user;
    if (!friend) return null;

    return (
      <TouchableOpacity 
        style={styles.friendCard}
        onPress={() => navigation.navigate('FriendProfile', { userId: friend.id, userName: friend.username })}
      >
        <View style={styles.friendInfo}>
          {friend.profilePicture ? (
            <Image source={{ uri: friend.profilePicture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <MaterialCommunityIcons name="account" size={24} color="#666" />
            </View>
          )}
          <View style={styles.friendDetails}>
            <Text style={styles.friendName}>{friend.username}</Text>
            {friend.displayName && (
              <Text style={styles.friendDisplayName}>{friend.displayName}</Text>
            )}
            {item.isCloseFriend && (
              <View style={styles.closeFriendBadge}>
                <MaterialCommunityIcons name="star" size={12} color="#FFD700" />
                <Text style={styles.closeFriendText}>Close Friend</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.friendActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleMessageFriend(friend)}
          >
            <MaterialCommunityIcons name="message" size={20} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRemoveFriend(item.id, friend.username)}
          >
            <MaterialCommunityIcons name="account-remove" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRequestItem = ({ item }: { item: FriendRequest }) => {
    return (
      <View style={styles.requestCard}>
        <View style={styles.friendInfo}>
          {item.user.profilePicture ? (
            <Image source={{ uri: item.user.profilePicture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <MaterialCommunityIcons name="account" size={24} color="#666" />
            </View>
          )}
          <View style={styles.friendDetails}>
            <Text style={styles.friendName}>{item.user.username}</Text>
            {item.user.name && (
              <Text style={styles.friendDisplayName}>{item.user.name}</Text>
            )}
          </View>
        </View>
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.requestButton, styles.acceptButton]}
            onPress={() => handleAcceptRequest(item.id)}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.requestButton, styles.rejectButton]}
            onPress={() => handleRejectRequest(item.id)}
          >
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSentRequestItem = ({ item }: { item: FriendRequest }) => {
    const friend = item.friend || item.user;
    if (!friend) return null;
    return (
      <View style={styles.friendCard}>
        <View style={styles.friendInfo}>
          {friend.profilePicture ? (
            <Image source={{ uri: friend.profilePicture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <MaterialCommunityIcons name="account" size={24} color="#666" />
            </View>
          )}
          <View style={styles.friendDetails}>
            <Text style={styles.friendName}>{friend.username}</Text>
            {friend.displayName && (
              <Text style={styles.friendDisplayName}>{friend.displayName}</Text>
            )}
            <Text style={styles.pendingText}>Request Pending</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSearchResultItem = ({ item }: { item: User }) => {
    const alreadyFriend = friends.some(
      f => (f.friendId === item.id || f.userId === item.id) && f.friendId !== currentUser?.id && f.userId !== currentUser?.id
    );
    const requestSent = sentRequests.some(r => r.friendId === item.id);

    return (
      <View style={styles.searchResultCard}>
        <View style={styles.friendInfo}>
          {item.profilePicture ? (
            <Image source={{ uri: item.profilePicture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <MaterialCommunityIcons name="account" size={24} color="#666" />
            </View>
          )}
          <View style={styles.friendDetails}>
            <Text style={styles.friendName}>{item.username}</Text>
            {item.name && (
              <Text style={styles.friendDisplayName}>{item.name}</Text>
            )}
          </View>
        </View>
        {alreadyFriend ? (
          <Text style={styles.alreadyFriendText}>Friends</Text>
        ) : requestSent ? (
          <Text style={styles.pendingText}>Pending</Text>
        ) : (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleSendRequest(item.id)}
          >
            <MaterialCommunityIcons name="account-plus" size={20} color="white" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      );
    }

    if (activeTab === 'friends') {
      if (friends.length === 0) {
        return (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-group-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No friends yet</Text>
            <Text style={styles.emptySubtext}>Add friends to start sharing memories</Text>
          </View>
        );
      }
      return (
        <FlatList
          data={friends}
          renderItem={renderFriendItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      );
    }

    if (activeTab === 'requests') {
      if (pendingRequests.length === 0) {
        return (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-clock-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No pending requests</Text>
          </View>
        );
      }
      return (
        <FlatList
          data={pendingRequests}
          renderItem={renderRequestItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      );
    }

    if (activeTab === 'sent') {
      if (sentRequests.length === 0) {
        return (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="account-arrow-right-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No sent requests</Text>
          </View>
        );
      }
      return (
        <FlatList
          data={sentRequests}
          renderItem={renderSentRequestItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>
        <TouchableOpacity
          style={styles.addFriendButton}
          onPress={() => setSearchModalVisible(true)}
        >
          <MaterialCommunityIcons name="account-plus" size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests ({pendingRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Sent ({sentRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {renderTabContent()}

      <Modal
        visible={searchModalVisible}
        animationType="slide"
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Friend</Text>
            <TouchableOpacity onPress={() => setSearchModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username or email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              {searching ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <MaterialCommunityIcons name="magnify" size={24} color="white" />
              )}
            </TouchableOpacity>
          </View>

          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResultItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContainer}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-search" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Search for friends</Text>
              <Text style={styles.emptySubtext}>Enter a username or email to find friends</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addFriendButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#6366f1',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
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
  listContainer: {
    padding: 16,
  },
  friendCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  friendDisplayName: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  closeFriendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  closeFriendText: {
    fontSize: 12,
    color: '#FFD700',
    marginLeft: 4,
  },
  friendActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  requestActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  requestButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#6366f1',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#f3f4f6',
  },
  rejectButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingText: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  alreadyFriendText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
});
