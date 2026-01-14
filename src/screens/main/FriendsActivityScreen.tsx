import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import RenderHtml from 'react-native-render-html';
import { Audio } from 'expo-av';
import { memoryService } from '../../services/memory';
import { Memory } from '../../types';

export default function FriendsActivityScreen({ navigation, route }: any) {
  const { width } = useWindowDimensions();
  const filterType = route?.params?.filterType; // 'core', 'user', 'friend', 'week', 'month'
  const filterUserId = route?.params?.filterUserId;
  
  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);
  const [olderMemories, setOlderMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showOlder, setShowOlder] = useState(false);
  const [olderPage, setOlderPage] = useState(1);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const soundRef = React.useRef<Audio.Sound | null>(null);

  useEffect(() => {
    loadRecentMemories();
  }, [filterType, filterUserId]);

  const loadRecentMemories = async () => {
    try {
      const response = await memoryService.getTimeline(1, 20); // ✅ Reduced from 100 to 20
      const data = Array.isArray(response) ? response : (response?.data || []);
      
      let filtered = data;
      
      // Apply filters based on filterType
      if (filterType && filterUserId) {
        switch (filterType) {
          case 'core':
            // Filter to user's core memories
            filtered = data.filter((memory: Memory) => 
              memory.userId === filterUserId && (memory as any).isCore === true
            );
            break;
          case 'user':
            // Filter to user's own memories
            filtered = data.filter((memory: Memory) => 
              memory.userId === filterUserId
            );
            break;
          case 'friend':
            // Filter to friend's memories (where friend is creator or tagged)
            filtered = data.filter((memory: Memory) => 
              memory.userId === filterUserId || 
              (memory.taggedUsers && memory.taggedUsers.some((u: any) => u.id === filterUserId))
            );
            break;
          case 'week':
            // Filter to user's memories from past week
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            filtered = data.filter((memory: Memory) => 
              memory.userId === filterUserId && new Date(memory.createdAt) >= oneWeekAgo
            );
            break;
          case 'month':
            // Filter to user's memories from past month
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            filtered = data.filter((memory: Memory) => 
              memory.userId === filterUserId && new Date(memory.createdAt) >= oneMonthAgo
            );
            break;
        }
      } else {
        // Default: last 7 days of memories (friends and own only - backend already filters)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filtered = data.filter((memory: Memory) => 
          new Date(memory.createdAt) >= sevenDaysAgo
        );
      }
      
      setRecentMemories(filtered);
    } catch (error) {
      console.error('Load recent memories error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadOlderMemories = async () => {
    if (!hasMoreOlder || loadingMore) return;
    
    try {
      setLoadingMore(true);
      
      // Load memories older than 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const response = await memoryService.getTimeline(olderPage, 20);
      const data = Array.isArray(response) ? response : (response?.data || []);
      
      // Filter to older than 7 days
      const older = data.filter((memory: Memory) => 
        new Date(memory.createdAt) < sevenDaysAgo
      );
      
      if (older.length === 0) {
        setHasMoreOlder(false);
      } else {
        setOlderMemories([...olderMemories, ...older]);
        setOlderPage(olderPage + 1);
      }
    } catch (error) {
      console.error('Load older memories error:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setShowOlder(false);
    setOlderMemories([]);
    setOlderPage(1);
    setHasMoreOlder(true);
    loadRecentMemories();
  };

  const handleDiscoverMore = () => {
    setShowOlder(true);
    loadOlderMemories();
  };

  const getHeaderTitle = () => {
    if (!filterType) return 'Friends Activity';
    
    switch (filterType) {
      case 'core': return 'Core Memories';
      case 'user': return 'My Memories';
      case 'friend': return 'Friend Memories';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'Friends Activity';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  const renderMemoryCard = (memory: Memory) => (
    <TouchableOpacity
      key={memory.id}
      style={styles.memoryCard}
      onPress={() => navigation.navigate('MemoryDetail', { memoryId: memory.id })}
    >
      <View style={styles.memoryHeader}>
        <View style={styles.authorRow}>
          {memory.user?.profilePicture ? (
            <Image source={{ uri: memory.user.profilePicture }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons name="account" size={20} color="#6366f1" />
            </View>
          )}
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>
              {memory.user?.name || memory.user?.username || 'Unknown'}
            </Text>
            <Text style={styles.timestamp}>{formatDate(memory.createdAt)}</Text>
          </View>
        </View>
      </View>

      {memory.title && <Text style={styles.memoryTitle}>{memory.title}</Text>}
      {memory.content && (
        <View style={styles.contentWrapper}>
          <RenderHtml
            contentWidth={width - 64}
            source={{ html: memory.content }}
            tagsStyles={{
              body: { fontSize: 14, lineHeight: 20, color: '#4b5563' },
              p: { marginTop: 0, marginBottom: 8 },
              strong: { fontWeight: '600' },
              em: { fontStyle: 'italic' },
              ul: { paddingLeft: 20 },
              ol: { paddingLeft: 20 },
            }}
          />
        </View>
      )}

      {memory.audioUrl && (
        <TouchableOpacity
          style={styles.audioPlayer}
          onPress={async () => {
            try {
              if (playingAudio === memory.id) {
                if (soundRef.current) {
                  await soundRef.current.stopAsync();
                  setPlayingAudio(null);
                }
              } else {
                if (soundRef.current) {
                  await soundRef.current.unloadAsync();
                }
                const { sound } = await Audio.Sound.createAsync(
                  { uri: memory.audioUrl },
                  { shouldPlay: true }
                );
                soundRef.current = sound;
                setPlayingAudio(memory.id);
                sound.setOnPlaybackStatusUpdate((status) => {
                  if (status.isLoaded && status.didJustFinish) {
                    setPlayingAudio(null);
                  }
                });
              }
            } catch (error) {
              console.error('Failed to play audio:', error);
            }
          }}
        >
          <View style={styles.audioPlayButton}>
            <MaterialCommunityIcons
              name={playingAudio === memory.id ? 'pause' : 'play'}
              size={16}
              color="#fff"
            />
          </View>
          <Text style={styles.audioText}>Voice note</Text>
        </TouchableOpacity>
      )}

      {memory.moods && memory.moods.length > 0 && (
        <View style={styles.moodRow}>
          {memory.moods.slice(0, 3).map((mood, index) => (
            <View key={index} style={styles.moodBadge}>
              <Text style={styles.moodText}>{mood}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <View style={styles.actionButton}>
          <MaterialCommunityIcons name="comment-outline" size={18} color="#6b7280" />
          <Text style={styles.actionText}>{memory._count?.comments || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.backButton}>
            <MaterialCommunityIcons name="bell-outline" size={24} color="#1f2937" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.backButton}>
          <MaterialCommunityIcons name="bell-outline" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Recent Memories (Last 7 Days) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last 7 Days</Text>
          {recentMemories.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-blank" size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No Recent Activity</Text>
              <Text style={styles.emptyText}>
                No memories from your friends in the last 7 days
              </Text>
            </View>
          ) : (
            recentMemories.map(renderMemoryCard)
          )}
        </View>

        {/* Discover More Gate */}
        {!showOlder && recentMemories.length > 0 && (
          <View style={styles.discoverSection}>
            <View style={styles.dividerLine} />
            <TouchableOpacity style={styles.discoverButton} onPress={handleDiscoverMore}>
              <MaterialCommunityIcons name="compass-outline" size={24} color="#6366f1" />
              <Text style={styles.discoverText}>Discover More</Text>
              <Text style={styles.discoverSubtext}>Load older memories</Text>
            </TouchableOpacity>
            <View style={styles.dividerLine} />
          </View>
        )}

        {/* Older Memories (Infinite Scroll) */}
        {showOlder && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Older Memories</Text>
            {olderMemories.length === 0 && !loadingMore ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="history" size={64} color="#d1d5db" />
                <Text style={styles.emptyTitle}>No Older Memories</Text>
                <Text style={styles.emptyText}>
                  No older memories to show
                </Text>
              </View>
            ) : (
              <>
                {olderMemories.map(renderMemoryCard)}
                {hasMoreOlder && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={loadOlderMemories}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <ActivityIndicator size="small" color="#6366f1" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="refresh" size={20} color="#6366f1" />
                        <Text style={styles.loadMoreText}>Load More</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  memoryHeader: {
    marginBottom: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  timestamp: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  memoryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  contentWrapper: {
    overflow: 'hidden',
    maxHeight: 60,
  },
  audioPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: 8,
  },
  audioPlayButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioText: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '600',
  },
  memoryContent: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  moodBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moodText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  discoverSection: {
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  discoverButton: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  discoverText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366f1',
    marginTop: 12,
  },
  discoverSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366f1',
  },
});
