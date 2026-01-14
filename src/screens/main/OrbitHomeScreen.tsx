import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Modal,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { memoryService } from '../../services/memory';
import { orbitService, OrbitItem } from '../../services/orbit';
import { statsService, DashboardStats } from '../../services/stats';
import { Memory } from '../../types';
import { MemoryLibraryCard } from '../../components/dashboard/MemoryLibraryCard';
import { ThisWeekCard } from '../../components/dashboard/ThisWeekCard';
import { MoodPaletteCard } from '../../components/dashboard/MoodPaletteCard';
import { MemoryLaneCard } from '../../components/dashboard/MemoryLaneCard';
import { QuickActionsCard } from '../../components/dashboard/QuickActionsCard';
import { FriendDashboard } from '../../components/FriendDashboard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ORBIT_HEIGHT = 400;

// Pre-defined scattered positions around center (20 max)
const ORBIT_POSITIONS = [
  // Inner ring - close to center
  { x: -80, y: -60 },
  { x: 70, y: -50 },
  { x: -70, y: 80 },
  { x: 85, y: 70 },
  { x: 0, y: -90 },
  
  // Medium distance
  { x: -120, y: -30 },
  { x: 130, y: 20 },
  { x: -40, y: 130 },
  { x: 100, y: -100 },
  { x: -110, y: 50 },
  
  // Outer positions - more scattered
  { x: -150, y: -90 },
  { x: 145, y: -80 },
  { x: -140, y: 110 },
  { x: 155, y: 100 },
  { x: -30, y: -130 },
  { x: 60, y: 140 },
  { x: -160, y: 15 },
  { x: 120, y: -30 },
  { x: 20, y: 150 },
  { x: 165, y: 35 },
];

export default function OrbitHomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [orbitItems, setOrbitItems] = useState<OrbitItem[]>([]);
  const [filteredOrbitItems, setFilteredOrbitItems] = useState<OrbitItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [olderMemories, setOlderMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrbitItem | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [longPressItem, setLongPressItem] = useState<OrbitItem | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [availableFriends, setAvailableFriends] = useState<any[]>([]);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [showFriendDashboard, setShowFriendDashboard] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<{ id: string; name: string } | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]); // Friends matching search but not in orbit

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedItem) {
      loadFilteredMemories();
    } else {
      loadDashboardStats();
    }
  }, [selectedItem]);

  const loadData = async () => {
    try {
      if (!selectedItem) {
        // Load dashboard when no filter is active
        await Promise.all([
          loadOrbitItems(),
          loadDashboardStats(),
        ]);
      } else {
        // Load filtered memories when item is selected
        await Promise.all([
          loadOrbitItems(),
          loadFilteredMemories(),
        ]);
      }
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const [stats, older] = await Promise.all([
        statsService.getDashboardStats(),
        statsService.getOlderMemories(),
      ]);
      setDashboardStats(stats);
      setOlderMemories(older);
    } catch (error) {
      console.error('Load dashboard stats error:', error);
    }
  };

  const loadOrbitItems = async () => {
    try {
      const items = await orbitService.getUserOrbit();
      console.log('Loaded orbit items:', JSON.stringify(items, null, 2));
      setOrbitItems(items);
      setFilteredOrbitItems(items);
    } catch (error) {
      console.error('Load orbit error:', error);
      Alert.alert('Error', 'Failed to load your orbit configuration');
    }
  };

  // Filter orbit items and search for non-orbit friends when search query changes
  useEffect(() => {
    const searchFriends = async () => {
      if (searchQuery.trim() === '') {
        setFilteredOrbitItems(orbitItems);
        setSearchResults([]);
      } else {
        // Filter existing orbit items
        const filtered = orbitItems.filter(item => 
          orbitService.getDisplayName(item).toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredOrbitItems(filtered);

        // Search for friends not in orbit
        if (searchQuery.length >= 2) {
          try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/search?query=${encodeURIComponent(searchQuery)}`, {
              headers: {
                'Authorization': `Bearer ${user?.token}`,
              },
            });
            const allUsers = await response.json();
            
            // Get IDs of users already in orbit
            const orbitUserIds = new Set(orbitItems.filter(item => item.type === 'PERSON').map(item => item.targetUserId));
            
            // Filter to friends not in orbit
            const nonOrbitFriends = allUsers.filter((u: any) => 
              u.friendship?.status === 'ACCEPTED' && !orbitUserIds.has(u.id)
            );
            setSearchResults(nonOrbitFriends);
          } catch (error) {
            console.error('Search friends error:', error);
          }
        } else {
          setSearchResults([]);
        }
      }
    };

    searchFriends();
  }, [searchQuery, orbitItems]);

  const loadFilteredMemories = async () => {
    if (!selectedItem) return;
    
    try {
      let filtered: Memory[] = [];
      
      if (selectedItem.type === 'PERSON' && selectedItem.targetUserId) {
        // Filter memories by person (author only)
        const allMemories = await memoryService.getTimeline(1, 100);
        const data = Array.isArray(allMemories) ? allMemories : (allMemories?.data || []);
        filtered = data.filter((m: Memory) => 
          m.userId === selectedItem.targetUserId
        );
      } else if (selectedItem.type === 'GROUP' && selectedItem.groupId) {
        // Filter memories by group
        const response = await memoryService.getGroupMemories(selectedItem.groupId, 1, 20);
        filtered = Array.isArray(response) ? response : (response?.data || []);
      } else if (selectedItem.type === 'CATEGORY' && selectedItem.categoryId) {
        // Filter memories by category
        const allMemories = await memoryService.getTimeline(1, 100);
        const data = Array.isArray(allMemories) ? allMemories : (allMemories?.data || []);
        filtered = data.filter((m: Memory) => 
          m.categories?.some(cat => cat.id === selectedItem.categoryId)
        );
      }
      
      setMemories(filtered);
    } catch (error) {
      console.error('Filter memories error:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOrbitItemPress = (item: OrbitItem) => {
    if (editMode) return; // Disable selection in edit mode
    
    // If tapping a PERSON, show friend dashboard
    if (item.type === 'PERSON' && item.targetUserId) {
      setSelectedFriend({ id: item.targetUserId, name: item.name });
      setShowFriendDashboard(true);
    } else {
      // For GROUP/CATEGORY, show filtered timeline as before
      setSelectedItem(selectedItem?.id === item.id ? null : item);
    }
  };

  const handleLongPress = (item: OrbitItem) => {
    if (editMode) return;
    if (item.type === 'GROUP' && item.groupId) {
      setLongPressItem(item);
    }
  };

  const handleDeleteItem = async (item: OrbitItem) => {
    Alert.alert(
      'Remove from Orbit',
      `Remove ${item.name} from your orbit?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await orbitService.deleteOrbitItem(item.id);
              await loadOrbitItems();
            } catch (error) {
              console.error('Delete orbit item error:', error);
              Alert.alert('Error', 'Failed to remove item from orbit');
            }
          },
        },
      ]
    );
  };

  const handleAddToOrbit = async (type: 'PERSON' | 'GROUP', targetId: string) => {
    try {
      // Find next available position
      const usedPositions = orbitItems.map(item => item.position);
      const nextPosition = Array.from({ length: 20 }, (_, i) => i).find(
        pos => !usedPositions.includes(pos)
      );
      
      if (nextPosition === undefined) {
        Alert.alert('Orbit Full', 'Your orbit is full (20 items max)');
        return;
      }

      const data: any = { type, position: nextPosition };
      
      if (type === 'PERSON') {
        const friend = availableFriends.find(f => f.id === targetId);
        data.name = friend?.name || friend?.username || 'Friend';
        data.targetUserId = targetId;
      } else if (type === 'GROUP') {
        const group = availableGroups.find(g => g.id === targetId);
        data.name = group?.name || 'Group';
        data.groupId = targetId;
        data.color = group?.color || '#6366f1';
      }

      await orbitService.createOrbitItem(data);
      await loadOrbitItems();
      setShowAddMenu(false);
    } catch (error) {
      console.error('Add to orbit error:', error);
      Alert.alert('Error', 'Failed to add item to orbit');
    }
  };

  const openAddMenu = async () => {
    setEditMode(false);
    try {
      const [friends, groups] = await Promise.all([
        orbitService.getAvailableFriends(),
        orbitService.getAvailableGroups(),
      ]);
      setAvailableFriends(friends);
      setAvailableGroups(groups);
      setShowAddMenu(true);
    } catch (error) {
      console.error('Load available items error:', error);
      Alert.alert('Error', 'Failed to load available items');
    }
  };

  const renderOrbitItem = (item: OrbitItem, index: number) => {
    const position = ORBIT_POSITIONS[item.position] || ORBIT_POSITIONS[index] || { x: 0, y: 0 };
    const isSelected = selectedItem?.id === item.id;
    const size = item.type === 'GROUP' ? 64 : 56;
    const color = orbitService.getColor(item);
    const icon = orbitService.getIcon(item);
    const memberCount = orbitService.getMemberCount(item);
    
    // Determine if we should show profile picture
    const profilePicture = item.type === 'PERSON' ? item.targetUser?.profilePicture : 
                          item.type === 'GROUP' ? item.group?.avatarUrl : null;
    
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.orbitItem,
          {
            left: SCREEN_WIDTH / 2 + position.x - size / 2,
            top: ORBIT_HEIGHT / 2 + position.y - size / 2,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: profilePicture ? '#fff' : color + '20',
            borderWidth: isSelected ? 3 : 2,
            borderColor: isSelected ? color : color + '40',
            overflow: 'hidden',
          },
        ]}
        onPress={() => handleOrbitItemPress(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        {profilePicture ? (
          <Image 
            source={{ uri: profilePicture }} 
            style={styles.orbitItemImage}
          />
        ) : icon && item.type !== 'PERSON' ? (
          <MaterialCommunityIcons name={icon} size={28} color={color} />
        ) : (
          <Text style={[styles.orbitInitial, { color }]}>
            {orbitService.getDisplayName(item).charAt(0).toUpperCase()}
          </Text>
        )}
        {memberCount > 0 && (
          <View style={[styles.countBadge, { backgroundColor: color }]}>
            <Text style={styles.countText}>{memberCount}</Text>
          </View>
        )}
        {editMode && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteItem(item)}
          >
            <MaterialCommunityIcons name="close-circle" size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderOrbitLabel = (item: OrbitItem, index: number) => {
    const position = ORBIT_POSITIONS[item.position] || ORBIT_POSITIONS[index] || { x: 0, y: 0 };
    const size = item.type === 'GROUP' ? 64 : 56;
    
    return (
      <View
        key={`label-${item.id}`}
        style={[
          styles.orbitLabel,
          {
            left: SCREEN_WIDTH / 2 + position.x - 40,
            top: ORBIT_HEIGHT / 2 + position.y + size / 2 + 4,
          },
        ]}
      >
        <Text style={styles.labelText} numberOfLines={1}>
          {orbitService.getDisplayName(item)}
        </Text>
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
          {item.user?.profilePicture ? (
            <Image 
              source={{ uri: item.user.profilePicture }} 
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="account" size={20} color="#6366f1" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.username}>
              {item.user?.name || item.user?.username || 'Unknown'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.timestamp}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {item.title && <Text style={styles.title}>{item.title}</Text>}
      <Text style={styles.content} numberOfLines={3}>
        {item.content}
      </Text>

      <View style={styles.actions}>
        <View style={styles.actionButton}>
          <MaterialCommunityIcons name="comment-outline" size={18} color="#6b7280" />
          <Text style={styles.actionText}>{item._count?.comments || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LiveArc</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <MaterialCommunityIcons name="bell-outline" size={24} color="#1f2937" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('SearchScreen')}
          >
            <MaterialCommunityIcons name="magnify" size={24} color="#1f2937" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setEditMode(!editMode)}
          >
            <MaterialCommunityIcons 
              name={editMode ? "check" : "pencil-outline"} 
              size={24} 
              color={editMode ? "#10b981" : "#6366f1"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Orbit Section */}
        <View style={styles.orbitContainer}>
          <View style={styles.orbitHeader}>
            <Text style={styles.sectionTitle}>Your Orbit</Text>
            {!editMode && orbitItems.length > 0 && (
              <View style={styles.searchContainer}>
                <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search orbit..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#9ca3af"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <MaterialCommunityIcons name="close-circle" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
          
          <View style={styles.orbitCanvas}>
            {/* Center - User */}
            <View style={styles.centerUser}>
              <View style={styles.userAvatar}>
                {user?.profilePicture ? (
                  <Image 
                    source={{ uri: user.profilePicture }} 
                    style={styles.centerUserImage}
                  />
                ) : (
                  <MaterialCommunityIcons name="account" size={36} color="#fff" />
                )}
              </View>
              <Text style={styles.userName}>You</Text>
            </View>

            {/* Orbit Items */}
            {filteredOrbitItems.map((item, index) => renderOrbitItem(item, index))}

            {/* Labels */}
            {filteredOrbitItems.map((item, index) => renderOrbitLabel(item, index))}
          </View>

          {/* Search Results - Friends not in orbit */}
          {searchQuery.length >= 2 && searchResults.length > 0 && !editMode && (
            <View style={styles.searchResultsContainer}>
              <Text style={styles.searchResultsTitle}>Friends not in orbit</Text>
              {searchResults.map((friend: any) => (
                <TouchableOpacity
                  key={friend.id}
                  style={styles.searchResultItem}
                  onPress={() => {
                    setSelectedFriend({ id: friend.id, name: friend.name || friend.username });
                    setShowFriendDashboard(true);
                  }}
                >
                  {friend.profilePicture ? (
                    <Image source={{ uri: friend.profilePicture }} style={styles.searchResultAvatar} />
                  ) : (
                    <View style={styles.searchResultAvatarPlaceholder}>
                      <MaterialCommunityIcons name="account" size={24} color="#6366f1" />
                    </View>
                  )}
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName}>{friend.name || friend.username}</Text>
                    {friend.username && friend.name && (
                      <Text style={styles.searchResultUsername}>@{friend.username}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.addToOrbitButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleAddToOrbit('PERSON', friend.id);
                      setSearchQuery('');
                    }}
                  >
                    <MaterialCommunityIcons name="plus-circle" size={24} color="#6366f1" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Edit Mode Actions */}
          {editMode && (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={openAddMenu}
            >
              <MaterialCommunityIcons name="plus-circle" size={20} color="#6366f1" />
              <Text style={styles.addButtonText}>Add to Orbit</Text>
            </TouchableOpacity>
          )}

          {/* Selected Filter */}
          {selectedItem && !editMode && (
            <TouchableOpacity 
              style={styles.clearFilterButton}
              onPress={() => setSelectedItem(null)}
            >
              <MaterialCommunityIcons name="close-circle" size={20} color="#6366f1" />
              <Text style={styles.clearFilterText}>Clear Filter</Text>
            </TouchableOpacity>
          )}

          {/* Empty State */}
          {orbitItems.length === 0 && !editMode && (
            <View style={styles.emptyOrbit}>
              <MaterialCommunityIcons name="orbit" size={48} color="#d1d5db" />
              <Text style={styles.emptyOrbitTitle}>Your orbit is empty</Text>
              <Text style={styles.emptyOrbitText}>
                Tap the edit button to add people and groups
              </Text>
            </View>
          )}
        </View>

        {/* Dashboard or Filtered Timeline */}
        {!selectedItem ? (
          /* Dashboard Section */
          <View style={styles.dashboardSection}>
            {dashboardStats && (
              <>
                <MemoryLibraryCard
                  coreMemories={dashboardStats.coreMemories}
                  collections={dashboardStats.collections}
                  totalMemories={dashboardStats.totalMemories}
                  onCoreMemoriesPress={() => {
                    // Navigate to FriendsActivity filtered to user's core memories
                    navigation.navigate('FriendsActivity', { filterType: 'core', filterUserId: user?.id });
                  }}
                  onCollectionsPress={() => {
                    // Navigate to ProfileTab > Collections
                    navigation.navigate('MainTabs', { screen: 'ProfileTab', params: { screen: 'Collections' } });
                  }}
                  onTotalMemoriesPress={() => {
                    // Navigate to FriendsActivity filtered to user's own memories
                    navigation.navigate('FriendsActivity', { filterType: 'user', filterUserId: user?.id });
                  }}
                />

                <ThisWeekCard
                  thisWeek={dashboardStats.thisWeek}
                  thisMonth={dashboardStats.thisMonth}
                  onThisWeekPress={() => navigation.navigate('FriendsActivity', { filterType: 'week', filterUserId: user?.id })}
                  onThisMonthPress={() => navigation.navigate('FriendsActivity', { filterType: 'month', filterUserId: user?.id })}
                />

                <MoodPaletteCard
                  topMoods={dashboardStats.topMoods}
                  onMoodPress={(mood) => navigation.navigate('Home')}
                />

                <MemoryLaneCard
                  olderMemories={olderMemories}
                  onMemoryPress={(memoryId) => navigation.navigate('MemoryDetail', { memoryId })}
                />

                <QuickActionsCard
                  draftsCount={dashboardStats.drafts}
                  onDraftsPress={() => navigation.navigate('Home')}
                  onNewMemoryPress={() => navigation.navigate('CreateMemory')}
                />
              </>
            )}

            {/* Friends Activity Button */}
            <TouchableOpacity
              style={styles.friendsActivityButton}
              onPress={() => navigation.navigate('FriendsActivity')}
            >
              <MaterialCommunityIcons name="account-group" size={24} color="#6366f1" />
              <Text style={styles.friendsActivityText}>Friends Activity</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#6366f1" />
            </TouchableOpacity>
          </View>
        ) : (
          /* Filtered Timeline Section for Groups/Categories */
          <View style={styles.timelineSection}>
            <View style={styles.timelineTitleRow}>
              <Text style={styles.timelineTitle}>
                {`${orbitService.getDisplayName(selectedItem)} Memories`}
              </Text>
            </View>

            {memories.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="timeline-text-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyTitle}>No Memories Found</Text>
                <Text style={styles.emptyText}>
                  No memories found for this filter
                </Text>
              </View>
            ) : (
              memories.map((memory) => (
                <View key={memory.id}>
                  {renderMemoryCard({ item: memory })}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Item Modal */}
      <Modal
        visible={showAddMenu}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddMenu(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Orbit</Text>
              <TouchableOpacity onPress={() => setShowAddMenu(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Available Friends */}
              {availableFriends.length > 0 && (
                <>
                  <Text style={styles.modalSectionTitle}>Friends</Text>
                  {availableFriends.map((friend) => (
                    <TouchableOpacity
                      key={friend.id}
                      style={styles.modalItem}
                      onPress={() => handleAddToOrbit('PERSON', friend.id)}
                    >
                      {friend.profilePicture ? (
                        <Image 
                          source={{ uri: friend.profilePicture }} 
                          style={styles.modalItemImage}
                        />
                      ) : (
                        <View style={styles.modalItemIcon}>
                          <MaterialCommunityIcons name="account" size={24} color="#6366f1" />
                        </View>
                      )}
                      <Text style={styles.modalItemText}>
                        {friend.name || friend.username}
                      </Text>
                      <MaterialCommunityIcons name="plus" size={20} color="#6366f1" />
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Available Groups */}
              {availableGroups.length > 0 && (
                <>
                  <Text style={styles.modalSectionTitle}>Groups</Text>
                  {availableGroups.map((group) => (
                    <TouchableOpacity
                      key={group.id}
                      style={styles.modalItem}
                      onPress={() => handleAddToOrbit('GROUP', group.id)}
                    >
                      {group.avatarUrl ? (
                        <Image 
                          source={{ uri: group.avatarUrl }} 
                          style={styles.modalItemImage}
                        />
                      ) : (
                        <View style={styles.modalItemIcon}>
                          <MaterialCommunityIcons name="account-group" size={24} color={group.color || '#6366f1'} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalItemText}>{group.name}</Text>
                        <Text style={styles.modalItemSubtext}>
                          {group.memberCount || 0} members
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="plus" size={20} color="#6366f1" />
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {availableFriends.length === 0 && availableGroups.length === 0 && (
                <View style={styles.modalEmpty}>
                  <MaterialCommunityIcons name="emoticon-sad-outline" size={48} color="#d1d5db" />
                  <Text style={styles.modalEmptyText}>
                    No items available to add
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Group Expansion Modal (Long Press) */}
      <Modal
        visible={!!longPressItem}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setLongPressItem(null)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLongPressItem(null)}
        >
          <View style={styles.expandedGroup}>
            {longPressItem && (
              <>
                <View style={styles.expandedHeader}>
                  <MaterialCommunityIcons 
                    name={orbitService.getIcon(longPressItem) || 'account-group'} 
                    size={32} 
                    color={orbitService.getColor(longPressItem)} 
                  />
                  <Text style={styles.expandedTitle}>
                    {orbitService.getDisplayName(longPressItem)}
                  </Text>
                  <TouchableOpacity onPress={() => setLongPressItem(null)}>
                    <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.expandedSubtitle}>
                  {orbitService.getMemberCount(longPressItem)} members
                </Text>

                <TouchableOpacity
                  style={styles.viewGroupButton}
                  onPress={() => {
                    setLongPressItem(null);
                    navigation.navigate('GroupDetail', { groupId: longPressItem.groupId });
                  }}
                >
                  <Text style={styles.viewGroupText}>View Group</Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#6366f1" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Friend Dashboard Modal */}
      <Modal
        visible={showFriendDashboard}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowFriendDashboard(false);
          setSelectedFriend(null);
        }}
      >
        {selectedFriend && (
          <FriendDashboard
            friendId={selectedFriend.id}
            friendName={selectedFriend.name}
            navigation={navigation}
            onClose={() => {
              setShowFriendDashboard(false);
              setSelectedFriend(null);
            }}
          />
        )}
      </Modal>

      {/* FAB - Create Memory */}
      {!editMode && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateMemory')}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#fff" />
        </TouchableOpacity>
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
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  orbitContainer: {
    backgroundColor: '#fff',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  orbitHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
    paddingVertical: 4,
  },
  orbitCanvas: {
    height: ORBIT_HEIGHT,
    width: '100%',
    position: 'relative',
  },
  centerUser: {
    position: 'absolute',
    left: SCREEN_WIDTH / 2 - 40,
    top: ORBIT_HEIGHT / 2 - 50,
    alignItems: 'center',
    zIndex: 10,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  centerUserImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  orbitItem: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orbitInitial: {
    fontSize: 24,
    fontWeight: '700',
  },
  orbitItemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 1000,
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  orbitLabel: {
    position: 'absolute',
    width: 80,
    alignItems: 'center',
  },
  labelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#eef2ff',
    borderRadius: 24,
    alignSelf: 'center',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366f1',
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#eef2ff',
    borderRadius: 20,
    alignSelf: 'center',
  },
  clearFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  emptyOrbit: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyOrbitTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },
  emptyOrbitText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  timelineSection: {
    padding: 16,
  },
  timelineTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
    flex: 1,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  memoryCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  categoryDot: {
    fontSize: 12,
    color: '#6b7280',
  },
  categoryText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
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
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  mood: {
    fontSize: 16,
  },
  moodMore: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginLeft: 2,
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
  dashboardSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  friendsActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 8,
  },
  friendsActivityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    flex: 1,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  modalScroll: {
    paddingHorizontal: 24,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 12,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
  },
  modalItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalItemImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  modalItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modalItemSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  modalEmpty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  modalEmptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  expandedGroup: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginTop: 'auto',
    marginBottom: 'auto',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expandedTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  expandedSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 8,
    marginLeft: 44,
  },
  viewGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
  },
  viewGroupText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  searchResultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  searchResultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  searchResultAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  searchResultUsername: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  addToOrbitButton: {
    padding: 4,
  },
});


