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
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/RootNavigator';
import { collectionService, type Collection, type UserCollections } from '../../services/collection';
import { friendService, type Friendship } from '../../services/friend';

type Props = NativeStackScreenProps<MainStackParamList, 'Collections'>;

export default function CollectionsScreen({ navigation }: Props) {
  const [collections, setCollections] = useState<UserCollections>({ owned: [], collaborated: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'owned' | 'collaborated'>('owned');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);

  const loadCollections = useCallback(async () => {
    try {
      const data = await collectionService.getUserCollections();
      setCollections(data);
    } catch (error) {
      console.error('Failed to load collections:', error);
      Alert.alert('Error', 'Failed to load collections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
    loadFriends();
  }, [loadCollections]);

  const loadFriends = async () => {
    try {
      const friendsList = await friendService.getFriends();
      setFriends(friendsList.filter(f => f.status === 'ACCEPTED'));
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCollections();
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      Alert.alert('Error', 'Please enter a collection name');
      return;
    }

    setCreating(true);
    try {
      const collection = await collectionService.createCollection({
        name: newCollectionName.trim(),
        description: newCollectionDescription.trim() || undefined,
        privacy: selectedFriends.length > 0 ? 'FRIENDS_ONLY' : 'PRIVATE',
        isCollaborative: selectedFriends.length > 0,
      });

      // Add collaborators
      for (const friendId of selectedFriends) {
        try {
          await collectionService.addCollaborator(collection.id, friendId, 'EDITOR');
        } catch (error) {
          console.error('Failed to add collaborator:', error);
        }
      }

      setCollections(prev => ({
        ...prev,
        owned: [collection, ...prev.owned],
      }));

      setCreateModalVisible(false);
      setNewCollectionName('');
      setNewCollectionDescription('');
      setSelectedFriends([]);
      
      // Navigate to the new collection
      navigation.navigate('CollectionDetail', { collectionId: collection.id });
    } catch (error) {
      console.error('Failed to create collection:', error);
      Alert.alert('Error', 'Failed to create collection');
    } finally {
      setCreating(false);
    }
  };

  const renderCollectionItem = ({ item }: { item: Collection }) => {
    const coverImage = item.coverImage || item.memories?.[0]?.memory?.photos?.[0];
    const memoryCount = item._count?.memories || 0;
    const collaboratorCount = item._count?.collaborators || 0;

    return (
      <TouchableOpacity
        style={styles.collectionCard}
        onPress={() => navigation.navigate('CollectionDetail', { collectionId: item.id })}
      >
        <View style={styles.cardCover}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.coverImage} />
          ) : (
            <View style={[styles.coverImage, styles.placeholderCover]}>
              <MaterialCommunityIcons name="image-multiple-outline" size={40} color="#999" />
            </View>
          )}
          {item.privacy !== 'PRIVATE' && (
            <View style={styles.privacyBadge}>
              <MaterialCommunityIcons
                name={item.privacy === 'PUBLIC' ? 'earth' : 'account-group-outline'}
                size={14}
                color="#fff"
              />
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.collectionName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description && (
            <Text style={styles.collectionDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="image-multiple-outline" size={16} color="#666" />
              <Text style={styles.metaText}>{memoryCount}</Text>
            </View>
            {item.isCollaborative && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="account-group-outline" size={16} color="#666" />
                <Text style={styles.metaText}>{collaboratorCount}</Text>
              </View>
            )}
            {item.location && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="map-marker-outline" size={16} color="#666" />
                <Text style={styles.metaText} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const displayCollections = activeTab === 'owned' ? collections.owned : collections.collaborated;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Collections</Text>
        <TouchableOpacity onPress={() => setCreateModalVisible(true)} style={styles.createButton}>
          <MaterialCommunityIcons name="plus-circle-outline" size={28} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'owned' && styles.activeTab]}
          onPress={() => setActiveTab('owned')}
        >
          <Text style={[styles.tabText, activeTab === 'owned' && styles.activeTabText]}>
            My Collections ({collections.owned.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'collaborated' && styles.activeTab]}
          onPress={() => setActiveTab('collaborated')}
        >
          <Text style={[styles.tabText, activeTab === 'collaborated' && styles.activeTabText]}>
            Shared ({collections.collaborated.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Collections List */}
      <FlatList
        data={displayCollections}
        renderItem={renderCollectionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="folder-multiple-image" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {activeTab === 'owned' 
                ? 'No collections yet\nTap + to create your first collection' 
                : 'No shared collections'}
            </Text>
          </View>
        }
      />

      {/* Create Collection Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Collection</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Collection name"
              value={newCollectionName}
              onChangeText={setNewCollectionName}
              autoFocus
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={newCollectionDescription}
              onChangeText={setNewCollectionDescription}
              multiline
              numberOfLines={3}
            />

            {friends.length > 0 && (
              <View style={styles.friendsSection}>
                <Text style={styles.sectionTitle}>Collaborate with friends (optional)</Text>
                <FlatList
                  data={friends}
                  scrollEnabled={false}
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
              </View>
            )}

            <TouchableOpacity
              style={[styles.createBtn, creating && styles.createBtnDisabled]}
              onPress={handleCreateCollection}
              disabled={creating}
            >
              <Text style={styles.createBtnText}>
                {creating ? 'Creating...' : 'Create Collection'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    fontSize: 20,
    fontWeight: '600',
  },
  createButton: {
    padding: 4,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#6366f1',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
  },
  collectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardCover: {
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
  },
  placeholderCover: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 6,
  },
  cardContent: {
    padding: 16,
  },
  collectionName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    color: '#111827',
    letterSpacing: -0.3,
  },
  collectionDescription: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 22,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#6b7280',
    marginTop: 20,
    textAlign: 'center',
    lineHeight: 26,
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
    padding: 20,
    maxHeight: '80%',
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
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  createBtn: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  friendsSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
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
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
});
