import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { Memory, User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

type SearchTab = 'all' | 'memories' | 'users' | 'groups';

interface SearchResults {
  memories?: Memory[];
  users?: User[];
  total?: number;
}

export default function SearchScreen({ navigation }: any) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [results, setResults] = useState<SearchResults>({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timer = setTimeout(() => {
        performSearch();
      }, 500); // Debounce search
      return () => clearTimeout(timer);
    } else {
      setResults({});
      setSearched(false);
    }
  }, [searchQuery, activeTab]);

  const performSearch = async () => {
    setLoading(true);
    try {
      let type: 'all' | 'memories' | 'users' = 'all';

      if (activeTab === 'memories') {
        type = 'memories';
      } else if (activeTab === 'users') {
        type = 'users';
      }

      const response: SearchResults = await api.get(`/api/search/global?q=${encodeURIComponent(searchQuery)}&type=${type}&limit=20`);

      setResults(response);
      setSearched(true);
    } catch (error: any) {
      console.error('Search failed:', error);
      setResults({});
    } finally {
      setLoading(false);
    }
  };

  const renderMemoryItem = ({ item }: { item: Memory }) => (
    <TouchableOpacity
      style={styles.memoryCard}
      onPress={() => navigation.navigate('MemoryDetail', { memoryId: item.id })}
    >
      {item.photos && item.photos.length > 0 && (
        <Image source={{ uri: item.photos[0] }} style={styles.memoryImage} />
      )}
      <View style={styles.memoryContent}>
        {item.title && (
          <Text style={styles.memoryTitle} numberOfLines={1}>
            {item.title}
          </Text>
        )}
        <Text style={styles.memoryText} numberOfLines={2}>
          {item.content}
        </Text>
        <View style={styles.memoryMeta}>
          <MaterialCommunityIcons name="calendar" size={14} color="#6b7280" />
          <Text style={styles.memoryDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          {item.privacy === 'PRIVATE' && (
            <View style={styles.privacyBadge}>
              <MaterialCommunityIcons name="lock" size={12} color="#6366f1" />
              <Text style={styles.privacyText}>Private</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }: { item: User }) => {
    const isFriend = (item as any).friendship?.status === 'ACCEPTED';
    const hasPendingRequest = (item as any).friendship?.status === 'PENDING';
    const isCurrentUser = item.id === user?.id;

    const handleFriendAction = async (e: any) => {
      e.stopPropagation();
      
      if (hasPendingRequest) {
        // Can't send another request
        return;
      }
      
      try {
        await api.post(`/api/friends/request`, { friendId: item.id });
        // Refresh the search to update the button state
        performSearch();
      } catch (error) {
        console.error('Friend request error:', error);
      }
    };

    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => {
          if (isCurrentUser) {
            navigation.navigate('Profile');
          } else {
            navigation.navigate('FriendProfile', {
              userId: item.id,
              userName: item.username,
            });
          }
        }}
      >
        {item.profilePicture ? (
          <Image source={{ uri: item.profilePicture }} style={styles.userAvatar} />
        ) : (
          <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
            <Text style={styles.userAvatarText}>
              {(item.name || item.username)?.[0]?.toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.displayName || item.username}
          </Text>
          <Text style={styles.userHandle}>@{item.username}</Text>
          {item.bio && (
            <Text style={styles.userBio} numberOfLines={1}>
              {item.bio}
            </Text>
          )}
        </View>
        
        {!isCurrentUser && !isFriend && !hasPendingRequest && (
          <TouchableOpacity 
            style={styles.addFriendButton}
            onPress={handleFriendAction}
          >
            <MaterialCommunityIcons name="account-plus" size={20} color="#fff" />
          </TouchableOpacity>
        )}
        
        {hasPendingRequest && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>Pending</Text>
          </View>
        )}
        
        {isFriend && (
          <MaterialCommunityIcons name="check-circle" size={24} color="#10b981" />
        )}
        
        {isCurrentUser && (
          <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (!searched) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="magnify" size={80} color="#d1d5db" />
          <Text style={styles.emptyTitle}>Search Memories & Friends</Text>
          <Text style={styles.emptyText}>
            Type at least 2 characters to start searching
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#d1d5db" />
        <Text style={styles.emptyTitle}>No results found</Text>
        <Text style={styles.emptyText}>
          Try different keywords or check your spelling
        </Text>
      </View>
    );
  };

  const renderTabButton = (tab: SearchTab, label: string, icon: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
      onPress={() => setActiveTab(tab)}
    >
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={activeTab === tab ? '#6366f1' : '#6b7280'}
      />
      <Text
        style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const getResultsToDisplay = () => {
    if (activeTab === 'all') {
      return [...(results.memories || []), ...(results.users || [])];
    } else if (activeTab === 'memories') {
      return results.memories || [];
    } else if (activeTab === 'users') {
      return results.users || [];
    }
    return [];
  };

  const renderItem = ({ item }: { item: any }) => {
    if ('content' in item) {
      return renderMemoryItem({ item });
    } else {
      return renderUserItem({ item });
    }
  };

  const resultsToDisplay = getResultsToDisplay();
  const hasResults = resultsToDisplay.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={24} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search memories, friends..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {renderTabButton('all', 'All', 'magnify')}
        {renderTabButton('memories', 'Memories', 'timeline-text')}
        {renderTabButton('users', 'People', 'account-multiple')}
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <FlatList
          data={resultsToDisplay}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.id}-${'content' in item ? 'memory' : 'user'}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Results Count */}
      {hasResults && searched && !loading && (
        <View style={styles.resultsCount}>
          <Text style={styles.resultsCountText}>
            {results.total !== undefined ? results.total : resultsToDisplay.length} result{(results.total !== undefined ? results.total : resultsToDisplay.length) !== 1 ? 's' : ''} found
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    padding: 0,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#eef2ff',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabButtonTextActive: {
    color: '#6366f1',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  memoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  memoryImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f3f4f6',
  },
  memoryContent: {
    padding: 12,
  },
  memoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  memoryText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  memoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memoryDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
    marginLeft: 8,
  },
  privacyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366f1',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e5e7eb',
  },
  userAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366f1',
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  userHandle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  userBio: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
  addFriendButton: {
    backgroundColor: '#6366f1',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  resultsCount: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
});
