import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTimeline } from '../../hooks/useQueries';
import { Memory } from '../../types';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TimelineScreen({ navigation }: any) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  
  const { data: response, isLoading, isRefetching, refetch } = useTimeline(page, 20);
  
  // Handle both response formats: { data: [] } or direct array
  const memories = Array.isArray(response) ? response : (response?.data || []);
  const hasMore = memories.length === 20;

  const loadMore = () => {
    if (!isLoading && hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  };

  const onRefresh = () => {
    setPage(1);
    refetch();
  };

  const renderMemoryCard = ({ item }: { item: Memory }) => (
    <TouchableOpacity 
      style={styles.memoryCard}
      onPress={() => navigation.navigate('MemoryDetail', { memoryId: item.id })}
    >
      <View style={styles.memoryHeader}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => {
            if (item.user?.id && item.user.id !== user?.id) {
              navigation.navigate('FriendProfile', { userId: item.user.id, userName: item.user.username });
            }
          }}
        >
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account" size={24} color="#6366f1" />
          </View>
          <View>
            <Text style={styles.username}>
              {item.user?.name || item.user?.username || 'Unknown'}
            </Text>
            <Text style={styles.timestamp}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {item.title && <Text style={styles.title}>{item.title}</Text>}
      <Text style={styles.content} numberOfLines={4}>
        {item.content.replace(/<[^>]*>/g, '')}
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
      <MaterialCommunityIcons name="timeline-text-outline" size={80} color="#d1d5db" />
      <Text style={styles.emptyTitle}>No Memories Yet</Text>
      <Text style={styles.emptyText}>Start creating memories to see them appear here ✨</Text>
    </View>
  );

  if (isLoading && page === 1) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Timeline</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => navigation.navigate('Search')}
          >
            <MaterialCommunityIcons name="magnify" size={24} color="#6b7280" />
          </TouchableOpacity>
          {user?.mode === 'RESTRICTED' && (
            <TouchableOpacity 
              style={styles.upgradeBadge}
              onPress={() => navigation.navigate('ProfileTab', { 
                screen: 'PricingScreen' 
              })}
            >
              <MaterialCommunityIcons name="crown" size={16} color="#f59e0b" />
              <Text style={styles.upgradeBadgeText}>Upgrade</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={memories}
        renderItem={renderMemoryCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor="#6366f1"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoading && page > 1 ? (
            <ActivityIndicator style={styles.footerLoader} color="#6366f1" />
          ) : null
        }
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchButton: {
    padding: 4,
  },
  upgradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  upgradeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  memoryCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  content: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  moods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  mood: {
    fontSize: 28,
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
    gap: 20,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
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
  footerLoader: {
    paddingVertical: 20,
  },
});
