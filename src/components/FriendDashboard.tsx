import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { memoryService } from '../services/memory';
import { friendService } from '../services/friend';
import { relationshipService, RelationshipCategory } from '../services/relationship';
import { collectionService } from '../services/collection';
import { Memory } from '../types';
import { Share } from 'react-native';

interface FriendDashboardProps {
  friendId: string;
  friendName: string;
  navigation: any;
  onClose: () => void;
}

export const FriendDashboard: React.FC<FriendDashboardProps> = ({
  friendId,
  friendName,
  navigation,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [relationshipData, setRelationshipData] = useState<any>(null); // Full relationship object with IDs for editing
  const [relationship, setRelationship] = useState<any>(null);
  const [relationshipHierarchy, setRelationshipHierarchy] = useState<string[]>([]);
  const [userRelationships, setUserRelationships] = useState<any[]>([]); // ALL relationships for this friend
  const [groupsInCommon, setGroupsInCommon] = useState(0);
  const [coreMemories, setCoreMemories] = useState(0);
  const [totalMemories, setTotalMemories] = useState(0);
  const [olderMemories, setOlderMemories] = useState<Memory[]>([]);
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [userCollections, setUserCollections] = useState<any[]>([]);
  const [relationshipCategories, setRelationshipCategories] = useState<RelationshipCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<string | null>(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showCreateSubcategory, setShowCreateSubcategory] = useState<string | null>(null);
  const [showCreateDetail, setShowCreateDetail] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');

  useEffect(() => {
    loadData();
    loadRelationshipCategories();
  }, [friendId]);

  const loadRelationshipCategories = async () => {
    try {
      const categories = await relationshipService.getCategories();
      setRelationshipCategories(categories);
    } catch (error) {
      console.error('Load relationship categories error:', error);
    }
  };

  const loadData = async () => {
    try {
      // Load friend's relationship info from backend
      const friendships = await friendService.getFriends();
      const friendship = friendships.find((f: any) => 
        f.friendId === friendId || f.userId === friendId
      );
      
      // Set relationship hierarchy from backend (3-level: category > subcategory > detail)
      if (friendship) {
        console.log('📊 Found friendship:', JSON.stringify(friendship, null, 2));
        
        // Store ALL relationships (array) for this friend
        const allRelationships = friendship.relationships || [];
        setUserRelationships(allRelationships);
        
        // For backward compatibility, set first relationship as primary
        if (allRelationships.length > 0) {
          setRelationship(allRelationships[0].label);
          setRelationshipHierarchy(allRelationships[0].hierarchy || []);
        } else {
          setRelationship(null);
          setRelationshipHierarchy([]);
        }
        
        console.log('✅ Set relationships:', allRelationships);
      } else {
        console.log('⚠️ No friendship found for friendId:', friendId);
      }

      // Load memories with this friend
      const allMemories = await memoryService.getTimeline(1, 100);
      const data = Array.isArray(allMemories) ? allMemories : (allMemories?.data || []);
      
      const friendMemories = data.filter((m: Memory) => m.userId === friendId);
      setTotalMemories(friendMemories.length);
      
      // Count core memories - filter by isCore
      const coreCount = friendMemories.filter((m: Memory) => (m as any).isCore === true).length;
      setCoreMemories(coreCount);
      
      // Get older memories
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const older = friendMemories
        .filter((m: Memory) => new Date(m.createdAt) < oneMonthAgo)
        .slice(0, 3);
      setOlderMemories(older);

      // Load groups in common
      const groupsData = await friendService.getGroupsInCommon(friendId);
      setGroupsInCommon(groupsData.count);
    } catch (error) {
      console.error('Load friend dashboard error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDeleteRelationship = async (relationshipId: string) => {
    Alert.alert(
      'Remove Relationship',
      'Remove this relationship categorization?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await relationshipService.removeRelationship(relationshipId);
              await loadData();
              // If we just deleted the relationship being edited, clear the modal data
              if (relationshipData?.id === relationshipId) {
                setRelationshipData(null);
                setSelectedCategory(null);
                setSelectedSubcategory(null);
                setSelectedDetail(null);
              }
            } catch (error) {
              console.error('Delete relationship error:', error);
              Alert.alert('Error', 'Failed to remove relationship');
            }
          },
        },
      ]
    );
  };

  // Initialize modal selections when opening
  useEffect(() => {
    if (showRelationshipModal) {
      // Set selections based on existing relationship data
      if (relationshipData) {
        setSelectedCategory(relationshipData.categoryId || null);
        setSelectedSubcategory(relationshipData.subcategoryId || null);
        setSelectedDetail(relationshipData.detailId || null);
      } else {
        // Clear selections for new relationship
        setSelectedCategory(null);
        setSelectedSubcategory(null);
        setSelectedDetail(null);
      }
    }
  }, [showRelationshipModal]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  const handleShareCollection = async () => {
    try {
      // Get user's collections
      const { owned } = await collectionService.getUserCollections();
      
      if (owned.length === 0) {
        Alert.alert('No Collections', 'Create a collection first to share it with your friend.');
        return;
      }

      setUserCollections(owned);
      setShowShareModal(true);
    } catch (error) {
      console.error('Failed to load collections:', error);
      Alert.alert('Error', 'Failed to load collections');
    }
  };

  const handleShareSelectedCollection = async (collection: any) => {
    try {
      // Add friend as VIEWER to the collection
      await collectionService.addCollaborator(collection.id, friendId, 'VIEWER');
      setShowShareModal(false);
      Alert.alert(
        'Collection Shared!',
        `${friendName} can now view "${collection.name}" in their Collections.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Share error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to share collection';
      Alert.alert('Error', errorMsg);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{friendName}</Text>
          <View style={{ width: 24 }} />
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
        <TouchableOpacity onPress={onClose}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{friendName}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Relationship Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="heart-outline" size={24} color="#ec4899" />
            <Text style={styles.cardTitle}>Relationships</Text>
            <TouchableOpacity onPress={() => {
              setRelationshipData(null); // Clear to add new
              setShowRelationshipModal(true);
            }}>
              <MaterialCommunityIcons name="plus" size={20} color="#6366f1" />
            </TouchableOpacity>
          </View>
          {userRelationships.length > 0 ? (
            <View style={styles.relationshipsContainer}>
              {userRelationships.map((rel, relIndex) => (
                <View key={rel.id || relIndex} style={styles.relationshipRow}>
                  <View style={styles.relationshipPills}>
                    {rel.hierarchy.map((level: string, index: number) => (
                      <View key={index} style={[
                        styles.relationshipPill,
                        index === 0 && styles.categoryPill,
                        index === 1 && styles.subcategoryPill,
                        index === 2 && styles.detailPill,
                      ]}>
                        <Text style={styles.pillText}>{level}</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity 
                    onPress={() => handleDeleteRelationship(rel.id)}
                    style={styles.deleteRelButton}
                  >
                    <MaterialCommunityIcons name="close" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.relationshipPlaceholder}>
              Tap + to add relationship categories for {friendName}
            </Text>
          )}
        </View>

        {/* Memory Library Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="bookshelf" size={24} color="#6366f1" />
            <Text style={styles.cardTitle}>Memory Library</Text>
          </View>

          <View style={styles.statsRow}>
            <TouchableOpacity 
              style={styles.stat} 
              onPress={() => {
                // Navigate to GroupsTab with filters
                navigation.navigate('MainTabs', { 
                  screen: 'GroupsTab', 
                  params: { 
                    screen: 'GroupsList', 
                    params: { filterType: 'common', friendId } 
                  } 
                });
              }}
            >
              <MaterialCommunityIcons name="account-group" size={20} color="#8b5cf6" />
              <Text style={styles.statNumber}>{groupsInCommon}</Text>
              <Text style={styles.statLabel}>Groups in common</Text>
              {groupsInCommon > 0 && <MaterialCommunityIcons name="chevron-right" size={16} color="#9ca3af" />}
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.stat} 
              onPress={() => {
                // Navigate to FriendsActivity filtered to this friend's core memories
                navigation.navigate('FriendsActivity', { filterType: 'core', filterUserId: friendId });
              }}
            >
              <MaterialCommunityIcons name="star" size={20} color="#f59e0b" />
              <Text style={styles.statNumber}>{coreMemories}</Text>
              <Text style={styles.statLabel}>Core</Text>
              {coreMemories > 0 && <MaterialCommunityIcons name="chevron-right" size={16} color="#9ca3af" />}
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.stat} 
              onPress={() => {
                // Navigate to FriendsActivity filtered to this friend only
                navigation.navigate('FriendsActivity', { filterType: 'friend', filterUserId: friendId });
              }}
            >
              <MaterialCommunityIcons name="book-open-variant" size={20} color="#6366f1" />
              <Text style={styles.statNumber}>{totalMemories}</Text>
              <Text style={styles.statLabel}>Memories</Text>
              {totalMemories > 0 && <MaterialCommunityIcons name="chevron-right" size={16} color="#9ca3af" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Memory Lane Card */}
        {olderMemories.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="camera-retro" size={24} color="#ec4899" />
              <Text style={styles.cardTitle}>Memory Lane</Text>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.memoriesScroll}
            >
              {olderMemories.map((memory) => (
                <TouchableOpacity
                  key={memory.id}
                  style={styles.memoryCard}
                  onPress={() => navigation.navigate('MemoryDetail', { memoryId: memory.id })}
                >
                  <Text style={styles.memoryDate}>{formatDate(memory.createdAt)}</Text>
                  {memory.title ? (
                    <Text style={styles.memoryTitle} numberOfLines={2}>
                      {memory.title}
                    </Text>
                  ) : (
                    <Text style={styles.memoryText} numberOfLines={3}>
                      {memory.content}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick Actions Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="lightning-bolt" size={24} color="#f59e0b" />
            <Text style={styles.cardTitle}>Quick Actions</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('CreateMemory', { taggedFriends: [friendId] })}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
                <MaterialCommunityIcons name="pencil-plus" size={24} color="#3b82f6" />
              </View>
              <Text style={styles.actionLabel}>New Memory</Text>
              <Text style={styles.actionSublabel}>Tag {friendName}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('DirectMessage', { userId: friendId })}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#dcfce7' }]}>
                <MaterialCommunityIcons name="message-text" size={24} color="#10b981" />
              </View>
              <Text style={styles.actionLabel}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleShareCollection}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
                <MaterialCommunityIcons name="share-variant" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.actionLabel}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Friend Activity Button */}
        <TouchableOpacity
          style={styles.friendActivityButton}
          onPress={() => navigation.navigate('FriendsActivity')}
        >
          <MaterialCommunityIcons name="timeline-text" size={24} color="#6366f1" />
          <Text style={styles.friendActivityText}>{friendName}'s Activity</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#6366f1" />
        </TouchableOpacity>
      </ScrollView>

      {/* Relationship Edit Modal */}
      <Modal
        visible={showRelationshipModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowRelationshipModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRelationshipModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>How do you know {friendName}?</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalScroll}>
            {/* Add New Category Button */}
            <TouchableOpacity
              style={styles.addNewButton}
              onPress={() => setShowCreateCategory(!showCreateCategory)}
            >
              <MaterialCommunityIcons name="plus-circle" size={20} color="#6366f1" />
              <Text style={styles.addNewText}>Add New Category</Text>
            </TouchableOpacity>

            {showCreateCategory && (
              <View style={styles.createContainer}>
                <TextInput
                  style={styles.createInput}
                  placeholder="Category name (e.g., Work, Family, School)"
                  value={newItemName}
                  onChangeText={setNewItemName}
                  autoFocus
                />
                <View style={styles.createActions}>
                  <TouchableOpacity
                    style={styles.createCancelButton}
                    onPress={() => {
                      setShowCreateCategory(false);
                      setNewItemName('');
                    }}
                  >
                    <Text style={styles.createCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.createSaveButton}
                    onPress={async () => {
                      if (!newItemName.trim()) return;
                      try {
                        await relationshipService.createCategory(newItemName.trim());
                        await loadRelationshipCategories();
                        setShowCreateCategory(false);
                        setNewItemName('');
                      } catch (error) {
                        Alert.alert('Error', 'Failed to create category');
                      }
                    }}
                  >
                    <Text style={styles.createSaveText}>Create</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {relationshipCategories.map((category) => (
              <View key={category.id} style={styles.categoryContainer}>
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    selectedCategory === category.id && styles.selectedCategory,
                  ]}
                  onPress={() => {
                    setSelectedCategory(selectedCategory === category.id ? null : category.id);
                    setSelectedSubcategory(null);
                    setSelectedDetail(null);
                  }}
                >
                  <View style={styles.categoryContent}>
                    <View style={[styles.categoryDot, { backgroundColor: '#6366f1' }]} />
                    <Text style={styles.categoryText}>{category.name}</Text>
                  </View>
                  <MaterialCommunityIcons 
                    name={selectedCategory === category.id ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#6366f1" 
                  />
                </TouchableOpacity>

                {selectedCategory === category.id && (
                  <View style={styles.subcategoriesContainer}>
                    {/* Add New Subcategory Button */}
                    <TouchableOpacity
                      style={styles.addSubButton}
                      onPress={() => setShowCreateSubcategory(showCreateSubcategory === category.id ? null : category.id)}
                    >
                      <MaterialCommunityIcons name="plus" size={18} color="#8b5cf6" />
                      <Text style={styles.addSubText}>Add Subcategory</Text>
                    </TouchableOpacity>

                    {showCreateSubcategory === category.id && (
                      <View style={styles.createSubContainer}>
                        <TextInput
                          style={styles.createInput}
                          placeholder="Subcategory name (e.g., Google, Stanford)"
                          value={newItemName}
                          onChangeText={setNewItemName}
                          autoFocus
                        />
                        <View style={styles.createActions}>
                          <TouchableOpacity
                            style={styles.createCancelButton}
                            onPress={() => {
                              setShowCreateSubcategory(null);
                              setNewItemName('');
                            }}
                          >
                            <Text style={styles.createCancelText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.createSaveButton}
                            onPress={async () => {
                              if (!newItemName.trim()) return;
                              try {
                                await relationshipService.createSubcategory(category.id, newItemName.trim());
                                await loadRelationshipCategories();
                                setShowCreateSubcategory(null);
                                setNewItemName('');
                              } catch (error) {
                                Alert.alert('Error', 'Failed to create subcategory');
                              }
                            }}
                          >
                            <Text style={styles.createSaveText}>Create</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {category.subcategories && category.subcategories.map((subcategory) => (
                      <View key={subcategory.id}>
                        <TouchableOpacity
                          style={[
                            styles.subcategoryButton,
                            selectedSubcategory === subcategory.id && styles.selectedSubcategory,
                          ]}
                          onPress={() => {
                            setSelectedSubcategory(selectedSubcategory === subcategory.id ? null : subcategory.id);
                            setSelectedDetail(null);
                          }}
                        >
                          <View style={styles.subcategoryContent}>
                            <View style={[styles.subcategoryDot, { backgroundColor: '#8b5cf6' }]} />
                            <Text style={styles.subcategoryText}>{subcategory.name}</Text>
                          </View>
                          {subcategory.details && subcategory.details.length > 0 && (
                            <MaterialCommunityIcons 
                              name={selectedSubcategory === subcategory.id ? "chevron-up" : "chevron-down"} 
                              size={18} 
                              color="#8b5cf6" 
                            />
                          )}
                        </TouchableOpacity>

                        {selectedSubcategory === subcategory.id && (
                          <View style={styles.detailsContainer}>
                            {/* Add New Detail Button */}
                            <TouchableOpacity
                              style={styles.addDetailButton}
                              onPress={() => setShowCreateDetail(showCreateDetail === subcategory.id ? null : subcategory.id)}
                            >
                              <MaterialCommunityIcons name="plus" size={16} color="#10b981" />
                              <Text style={styles.addDetailText}>Add Detail</Text>
                            </TouchableOpacity>

                            {showCreateDetail === subcategory.id && (
                              <View style={styles.createDetailContainer}>
                                <TextInput
                                  style={styles.createInput}
                                  placeholder="Detail name (e.g., Engineering, Sales)"
                                  value={newItemName}
                                  onChangeText={setNewItemName}
                                  autoFocus
                                />
                                <View style={styles.createActions}>
                                  <TouchableOpacity
                                    style={styles.createCancelButton}
                                    onPress={() => {
                                      setShowCreateDetail(null);
                                      setNewItemName('');
                                    }}
                                  >
                                    <Text style={styles.createCancelText}>Cancel</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.createSaveButton}
                                    onPress={async () => {
                                      if (!newItemName.trim()) return;
                                      try {
                                        await relationshipService.createDetail(subcategory.id, newItemName.trim());
                                        await loadRelationshipCategories();
                                        setShowCreateDetail(null);
                                        setNewItemName('');
                                      } catch (error) {
                                        Alert.alert('Error', 'Failed to create detail');
                                      }
                                    }}
                                  >
                                    <Text style={styles.createSaveText}>Create</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}

                            {subcategory.details && subcategory.details.map((detail) => (
                              <TouchableOpacity
                                key={detail.id}
                                style={[
                                  styles.detailButton,
                                  selectedDetail === detail.id && styles.selectedDetail,
                                ]}
                                onPress={() => setSelectedDetail(detail.id)}
                              >
                                <View style={styles.detailContent}>
                                  <View style={[styles.detailDot, { backgroundColor: '#10b981' }]} />
                                  <Text style={styles.detailText}>{detail.name}</Text>
                                </View>
                                {selectedDetail === detail.id && (
                                  <MaterialCommunityIcons name="check-circle" size={18} color="#10b981" />
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!selectedCategory && !selectedSubcategory && !selectedDetail) && styles.saveButtonDisabled
              ]}
              onPress={async () => {
                // Validate at least one level is selected
                if (!selectedCategory && !selectedSubcategory && !selectedDetail) {
                  Alert.alert('Selection Required', 'Please select at least one relationship level (category, subcategory, or detail) before saving.');
                  return;
                }
                
                try {
                  await relationshipService.assignRelationship({
                    friendId,
                    categoryId: selectedCategory || undefined,
                    subcategoryId: selectedSubcategory || undefined,
                    detailId: selectedDetail || undefined,
                  });
                  await loadData();
                  setShowRelationshipModal(false);
                } catch (error) {
                  console.error('Save relationship error:', error);
                  Alert.alert('Error', 'Failed to save relationship. Please try again.');
                }
              }}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Share Collection Modal */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.shareModalOverlay}>
          <View style={styles.shareModalContent}>
            <View style={styles.shareModalHeader}>
              <Text style={styles.shareModalTitle}>Share Collection</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.shareModalSubtitle}>Choose a collection to share with {friendName}</Text>
            
            <ScrollView style={styles.shareCollectionsList}>
              {userCollections.map((collection) => (
                <TouchableOpacity
                  key={collection.id}
                  style={styles.shareCollectionItem}
                  onPress={() => handleShareSelectedCollection(collection)}
                >
                  <View style={styles.shareCollectionPreview}>
                    {collection.coverUrl ? (
                      <Image 
                        source={{ uri: collection.coverUrl }} 
                        style={styles.shareCollectionThumbnail}
                      />
                    ) : (
                      <View style={styles.shareCollectionPlaceholder}>
                        <MaterialCommunityIcons name="folder-multiple-image" size={32} color="#9ca3af" />
                      </View>
                    )}
                  </View>
                  <View style={styles.shareCollectionInfo}>
                    <Text style={styles.shareCollectionName}>{collection.name}</Text>
                    <Text style={styles.shareCollectionCount}>
                      {collection.memoryCount || 0} {collection.memoryCount === 1 ? 'memory' : 'memories'}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="share-variant" size={24} color="#6366f1" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  relationshipText: {
    fontSize: 16,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  memoriesScroll: {
    paddingVertical: 4,
  },
  memoryCard: {
    width: 200,
    marginRight: 12,
    backgroundColor: '#fdf2f8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fce7f3',
  },
  memoryDate: {
    fontSize: 11,
    color: '#ec4899',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  memoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  memoryText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '600',
    textAlign: 'center',
  },
  actionSublabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
    textAlign: 'center',
  },
  friendActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 8,
  },
  friendActivityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    flex: 1,
    marginLeft: 4,
  },
  relationshipPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  relationshipsContainer: {
    gap: 10,
  },
  relationshipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteRelButton: {
    padding: 4,
  },
  relationshipPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryPill: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  subcategoryPill: {
    backgroundColor: '#f3e8ff',
    borderColor: '#8b5cf6',
  },
  detailPill: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  relationshipPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  categoryContainer: {
    marginBottom: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  selectedCategory: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  subcategoriesContainer: {
    marginTop: 8,
    marginLeft: 16,
  },
  subcategoryButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 6,
  },
  selectedSubcategory: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f3e8ff',
  },
  subcategoryText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  detailsContainer: {
    marginTop: 4,
    marginLeft: 16,
  },
  detailButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 4,
  },
  selectedDetail: {
    borderColor: '#10b981',
    backgroundColor: '#d1fae5',
  },
  detailText: {
    fontSize: 14,
    color: '#4b5563',
  },
  modalActions: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  saveButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addNewText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366f1',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subcategoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subcategoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  detailContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  createContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  createSubContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  createDetailContainer: {
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  createInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    fontSize: 15,
    marginBottom: 8,
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  createCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  createCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  createSaveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#6366f1',
  },
  createSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  addSubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#8b5cf6',
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  addSubText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  addDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
    borderStyle: 'dashed',
    marginBottom: 6,
  },
  addDetailText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  // Share Modal
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  shareModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  shareModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  shareModalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  shareCollectionsList: {
    padding: 20,
  },
  shareCollectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  shareCollectionPreview: {
    width: 60,
    height: 60,
    marginRight: 12,
  },
  shareCollectionThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  shareCollectionPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareCollectionInfo: {
    flex: 1,
  },
  shareCollectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  shareCollectionCount: {
    fontSize: 13,
    color: '#6b7280',
  },
});


