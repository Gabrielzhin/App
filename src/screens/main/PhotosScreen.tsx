import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memoryService } from '../../services/memory';
import { collectionService, UserCollections } from '../../services/collection';
import { Memory } from '../../types';
import { api } from '../../services/api';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 48) / 3; // 3 columns with padding

interface PhotoWithMemory {
  url: string;
  memoryId: string;
  memoryTitle?: string;
  createdAt: string;
}

interface PhotosByMonth {
  monthYear: string;
  photos: PhotoWithMemory[];
}

export default function PhotosScreen({ navigation }: any) {
  const [photosByMonth, setPhotosByMonth] = useState<PhotosByMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [totalMemories, setTotalMemories] = useState(0);
  const [totalCollections, setTotalCollections] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Get only user's own memories
      const response = await api.get('/api/memories', { limit: 200 });
      const memories = Array.isArray(response) ? response : response?.data || [];
      
      // Get collections count
      const collections: UserCollections = await collectionService.getUserCollections();
      const collectionsCount = (collections.owned?.length || 0) + (collections.collaborated?.length || 0);
      setTotalCollections(collectionsCount);
      
      // Extract all photos from user's memories
      const allPhotos: PhotoWithMemory[] = [];
      memories.forEach((memory: Memory) => {
        if (memory.photos && memory.photos.length > 0) {
          memory.photos.forEach((photoUrl: string) => {
            allPhotos.push({
              url: photoUrl,
              memoryId: memory.id,
              memoryTitle: memory.title,
              createdAt: memory.memoryDate || memory.createdAt, // Use memoryDate if set, otherwise createdAt
            });
          });
        }
      });

      // Sort by date (newest first)
      allPhotos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Group by month
      const grouped = groupPhotosByMonth(allPhotos);
      setPhotosByMonth(grouped);
      setTotalPhotos(allPhotos.length);
      setTotalMemories(new Set(allPhotos.map((p) => p.memoryId)).size);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const groupPhotosByMonth = (photos: PhotoWithMemory[]): PhotosByMonth[] => {
    const grouped: { [key: string]: PhotoWithMemory[] } = {};
    
    photos.forEach((photo) => {
      const date = new Date(photo.createdAt);
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      grouped[monthYear].push(photo);
    });

    // Convert to array and sort by date
    return Object.entries(grouped)
      .map(([monthYear, photos]) => ({ monthYear, photos }))
      .sort((a, b) => {
        const dateA = new Date(a.photos[0].createdAt);
        const dateB = new Date(b.photos[0].createdAt);
        return dateB.getTime() - dateA.getTime();
      });
  };

  const onRefresh = () => {
    loadData(true);
  };

  const handlePhotoPress = (photo: PhotoWithMemory) => {
    navigation.navigate('MemoryDetail', { memoryId: photo.memoryId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Photos</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalPhotos}</Text>
          <Text style={styles.statLabel}>Total Photos</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalMemories}</Text>
          <Text style={styles.statLabel}>Memories</Text>
        </View>
        <TouchableOpacity 
          style={styles.statItem}
          onPress={() => navigation.navigate('ProfileTab', { screen: 'Collections' })}
        >
          <Text style={styles.statNumber}>{totalCollections}</Text>
          <Text style={styles.statLabel}>Collections</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {photosByMonth.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="image-off-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No photos yet</Text>
            <Text style={styles.emptySubtext}>
              Start creating memories with photos!
            </Text>
          </View>
        ) : (
          photosByMonth.map((group) => (
            <View key={group.monthYear} style={styles.monthSection}>
              <Text style={styles.monthTitle}>{group.monthYear}</Text>
              <View style={styles.photoGrid}>
                {group.photos.map((photo, index) => (
                  <TouchableOpacity
                    key={`${photo.url}-${index}`}
                    style={styles.photoItem}
                    onPress={() => handlePhotoPress(photo)}
                  >
                    <Image 
                      source={{ uri: photo.url }} 
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  stats: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366f1',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
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
  monthSection: {
    marginBottom: 24,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  photoItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
});
