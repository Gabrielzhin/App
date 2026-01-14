import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { groupService } from '../../services/group';
import { friendService } from '../../services/friend';
import { useGroups, useDiscoverGroups } from '../../hooks/useQueries';
import { Group } from '../../types';

export default function GroupsScreen({ navigation, route }: any) {
  const filterType = route?.params?.filterType; // 'common'
  const friendId = route?.params?.friendId;
  
  // Use React Query for groups data
  const { data: groupsResponse, isLoading, refetch } = useGroups();
  const groups = Array.isArray(groupsResponse) ? groupsResponse : (groupsResponse?.data || []);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  // Use React Query for search
  const { data: searchResults = [], isLoading: searching } = useDiscoverGroups(searchQuery);

  // Handle search input changes
  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  useFocusEffect(
    React.useCallback(() => {
      refetch(); // Refetch on screen focus
    }, [filterType, friendId, refetch])
  );

  const renderGroupCard = ({ item }: { item: Group }) => (
    <TouchableOpacity 
      style={styles.groupCard}
      onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
    >
      {/* Banner/Cover Image */}
      {item.coverImage ? (
        <Image source={{ uri: item.coverImage }} style={styles.groupBanner} />
      ) : (
        <View style={[styles.groupBannerPlaceholder, { backgroundColor: item.color || '#6366f1' }]} />
      )}

      {/* Avatar Icon */}
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={styles.groupAvatar} />
      ) : (
        <View
          style={[
            styles.groupIcon,
            { backgroundColor: '#ffffff', borderColor: item.color || '#6366f1', borderWidth: 3 },
          ]}
        >
          <MaterialCommunityIcons name="account-group" size={36} color={item.color || '#6366f1'} />
        </View>
      )}

      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.groupDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.groupMeta}>
          <MaterialCommunityIcons name="account" size={14} color="#6b7280" />
          <Text style={styles.groupMetaText}>{item.memberCount} members</Text>
          <View style={styles.privacyBadge}>
            <MaterialCommunityIcons
              name={
                item.privacy === 'PUBLIC'
                  ? 'earth'
                  : item.privacy === 'FRIENDS_ONLY'
                  ? 'account-group'
                  : 'lock'
              }
              size={12}
              color="#6b7280"
            />
            <Text style={styles.privacyText}>{item.privacy}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="account-group-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyTitle}>No groups yet</Text>
      <Text style={styles.emptyText}>Join or create a group to get started</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Groups & Friends</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <MaterialCommunityIcons name="magnify" size={24} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateGroup')}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#6366f1" />
          </TouchableOpacity>
        </View>
      </View>

      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search public groups..."
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {showSearch && searchQuery.length > 0 ? (
        <View style={styles.searchResultsContainer}>
          <Text style={styles.sectionTitle}>
            {searching ? 'SEARCHING...' : `SEARCH RESULTS (${searchResults.length})`}
          </Text>
          {searching ? (
            <ActivityIndicator size="large" color="#6366f1" style={styles.searchLoader} />
          ) : (
            <FlatList
              data={searchResults}
              renderItem={renderGroupCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="magnify" size={64} color="#d1d5db" />
                  <Text style={styles.emptyTitle}>No groups found</Text>
                  <Text style={styles.emptyText}>Try searching with different keywords</Text>
                </View>
              }
            />
          )}
        </View>
      ) : (
        <>
          {/* Friends Quick Access */}
          <TouchableOpacity 
            style={styles.friendsCard}
            onPress={() => navigation.navigate('FriendsList')}
          >
            <View style={styles.friendsIconContainer}>
              <MaterialCommunityIcons name="account-multiple" size={32} color="#6366f1" />
            </View>
            <View style={styles.friendsInfo}>
              <Text style={styles.friendsTitle}>My Friends</Text>
              <Text style={styles.friendsSubtitle}>View and manage your friends</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>MY GROUPS</Text>

          <FlatList
            data={groups}
            renderItem={renderGroupCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
          />
        </>
      )}
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
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
    color: '#111827',
  },
  searchResultsContainer: {
    flex: 1,
  },
  searchLoader: {
    marginTop: 32,
  },
  friendsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  friendsIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendsInfo: {
    flex: 1,
    marginLeft: 16,
  },
  friendsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  friendsSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 1,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  groupBanner: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  groupBannerPlaceholder: {
    width: '100%',
    height: 120,
  },
  groupIcon: {
    width: 72,
    height: 72,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -36,
    marginLeft: 20,
    marginBottom: 12,
  },
  groupAvatar: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginTop: -36,
    marginLeft: 20,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#fff',
  },
  groupInfo: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  groupDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 10,
    lineHeight: 20,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupMetaText: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 8,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  privacyText: {
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 24,
    letterSpacing: -0.5,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
});
