import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/RootNavigator';
import { collectionService, type Collection } from '../../services/collection';
import { useCollectionDetail } from '../../hooks/useQueries';

type Props = NativeStackScreenProps<MainStackParamList, 'CollectionDetail'>;

export default function CollectionDetailScreen({ navigation, route }: Props) {
  const { collectionId } = route.params;
  
  // Use React Query for data fetching with automatic caching
  const { data: collection, isLoading, refetch, isRefetching } = useCollectionDetail(collectionId);

  const handleRefresh = () => {
    refetch();
  };

  const handleMemoryPress = (memoryId: string) => {
    navigation.navigate('MemoryDetail', { id: memoryId });
  };

  const handleRemoveMemory = (memoryId: string) => {
    Alert.alert(
      'Remove Memory',
      'Remove this memory from the collection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await collectionService.removeMemoryFromCollection(collectionId, memoryId);
              refetch(); // Refetch to update UI
            } catch (error) {
              Alert.alert('Error', 'Failed to remove memory');
            }
          },
        },
      ]
    );
  };

  const renderMemoryItem = ({ item }: { item: Collection['memories'][0] }) => {
    const photo = item.memory.photos[0];
    
    return (
      <TouchableOpacity
        style={styles.memoryCard}
        onPress={() => handleMemoryPress(item.memoryId)}
        onLongPress={() => handleRemoveMemory(item.memoryId)}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={styles.memoryImage} />
        ) : (
          <View style={[styles.memoryImage, styles.placeholderImage]}>
            <MaterialCommunityIcons name="image-outline" size={32} color="#999" />
          </View>
        )}
        <View style={styles.memoryInfo}>
          <Text style={styles.memoryContent} numberOfLines={2}>
            {item.memory.title || item.memory.content}
          </Text>
          <Text style={styles.memoryAuthor}>
            by {item.memory.user.name || item.memory.user.username}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
        </View>
      </SafeAreaView>
    );
  }

  if (!collection) {
    return null;
  }

  const coverImage = collection.coverImage || collection.memories[0]?.memory.photos[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {collection.name}
        </Text>
        <TouchableOpacity style={styles.menuButton}>
          <MaterialCommunityIcons name="dots-horizontal" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={collection.memories}
        renderItem={renderMemoryItem}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />}
        ListHeaderComponent={
          <View>
            {/* Cover Image */}
            {coverImage ? (
              <Image source={{ uri: coverImage }} style={styles.coverImage} />
            ) : (
              <View style={[styles.coverImage, styles.placeholderCover]}>
                <MaterialCommunityIcons name="image-multiple-outline" size={64} color="#999" />
              </View>
            )}

            {/* Collection Info */}
            <View style={styles.infoSection}>
              <Text style={styles.collectionName}>{collection.name}</Text>
              {collection.description && (
                <Text style={styles.description}>{collection.description}</Text>
              )}
              
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="image-multiple-outline" size={20} color="#666" />
                  <Text style={styles.metaText}>{collection._count.memories} memories</Text>
                </View>
                {collection.isCollaborative && (
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons name="account-group-outline" size={20} color="#666" />
                    <Text style={styles.metaText}>{collection._count.collaborators} collaborators</Text>
                  </View>
                )}
              </View>

              {collection.location && (
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={18} color="#666" />
                  <Text style={styles.locationText}>{collection.location}</Text>
                </View>
              )}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Memories</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="image-multiple-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No memories yet</Text>
            <Text style={styles.emptySubtext}>Add memories from the memory detail screen</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  menuButton: {
    padding: 4,
  },
  coverImage: {
    width: '100%',
    height: 240,
    backgroundColor: '#f5f5f5',
  },
  placeholderCover: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    padding: 16,
  },
  collectionName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  listContent: {
    flexGrow: 1,
  },
  memoryCard: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  memoryImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  memoryInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  memoryContent: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  memoryAuthor: {
    fontSize: 13,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
  },
});
