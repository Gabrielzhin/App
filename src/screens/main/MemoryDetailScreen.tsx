import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Share,
  Platform,
  Modal,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ImageView from 'react-native-image-viewing';
import RenderHtml from 'react-native-render-html';
import { Audio } from 'expo-av';
import { memoryService } from '../../services/memory';
import { commentService } from '../../services/comment';
import { reactionService } from '../../services/reaction';
import { collectionService, type Collection } from '../../services/collection';
import { friendService, type Friendship } from '../../services/friend';
import { Memory, Comment, Reaction, ReactionType } from '../../types';
import { REACTION_OPTIONS, getReactionLabel, getReactionIcon } from '../../utils/reactions';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface Props {
  route: any;
  navigation: any;
}

export default function MemoryDetailScreen({ route, navigation }: Props) {
  const { memoryId } = route.params;
  const { width: windowWidth } = useWindowDimensions();
  const { user } = useAuth();
  const soundRef = React.useRef<Audio.Sound | null>(null);
  const [memory, setMemory] = useState<Memory | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [showFullContent, setShowFullContent] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [replyToComment, setReplyToComment] = useState<Comment | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [photoCarouselIndex, setPhotoCarouselIndex] = useState(0);
  const [showCoreReasonModal, setShowCoreReasonModal] = useState(false);
  const [coreReasonInput, setCoreReasonInput] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    loadMemoryDetails();
  }, [memoryId]);

  const loadMemoryDetails = async () => {
    try {
      setLoading(true);
      const memoryData = await memoryService.getMemory(memoryId);
      console.log('Memory loaded:', { id: memoryData.id, hasAudio: !!memoryData.audioUrl, audioUrl: memoryData.audioUrl });
      setMemory(memoryData);
      
      // Try to load comments, but don't fail if endpoint doesn't exist
      try {
        const commentsData = await commentService.getComments(memoryId);
        setComments(Array.isArray(commentsData) ? commentsData : (commentsData as any)?.data || []);
      } catch (commentError: any) {
        console.log('Comments not available:', commentError?.response?.status);
        // Comments endpoint doesn't exist yet, just use empty array
        setComments([]);
      }

      // Load reactions
      try {
        const reactionsData = await reactionService.getReactions(memoryId);
        setReactions(reactionsData);
      } catch (error: any) {
        console.log('Reactions not available:', error?.response?.status);
        setReactions([]);
      }
    } catch (error: any) {
      console.error('Error loading memory:', error);
      Alert.alert('Error', 'Failed to load memory details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    try {
      setSubmitting(true);
      const newComment = await commentService.createComment(
        memoryId, 
        commentText.trim(),
        replyToComment?.id
      );
      
      if (replyToComment) {
        // Add reply to parent comment
        setComments(comments.map(c => {
          if (c.id === replyToComment.id) {
            return {
              ...c,
              replies: [...(c.replies || []), newComment]
            };
          }
          // Check nested replies
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map(reply => {
                if (reply.id === replyToComment.id) {
                  return {
                    ...reply,
                    replies: [...(reply.replies || []), newComment]
                  };
                }
                return reply;
              })
            };
          }
          return c;
        }));
      } else {
        // Add as top-level comment
        setComments([newComment, ...comments]);
      }
      
      setCommentText('');
      setReplyToComment(null);
      setShowReplyModal(false);
    } catch (error: any) {
      const errorMsg = error.response?.status === 404 
        ? 'Comments feature not available yet' 
        : error.response?.data?.error || 'Failed to add comment';
      Alert.alert('Error', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await commentService.deleteComment(memoryId, commentId);
              setComments(comments.filter((c) => c.id !== commentId));
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };

  const handleReaction = async (type: ReactionType) => {
    try {
      const result = await reactionService.toggleReaction(memoryId, type);
      
      if ('removed' in result && result.removed) {
        // Reaction was removed
        setReactions(reactions.filter((r) => !(r.type === type && r.userId === user?.id)));
      } else {
        // Reaction was added
        const newReaction = result as Reaction;
        setReactions([newReaction, ...reactions]);
      }
    } catch (error: any) {
      console.error('Error toggling reaction:', error);
    }
  };

  const handleShare = async () => {
    try {
      const message = `${memory?.title ? memory.title + '\n\n' : ''}${memory?.content}`;
      await Share.share({
        message,
        title: memory?.title || 'Memory',
      });
    } catch (error: any) {
      console.error('Error sharing:', error);
    }
  };

  const saveCoreMemory = async () => {
    if (!memory) return;
    
    try {
      const updated = await memoryService.toggleCore(memory.id, true, coreReasonInput || undefined);
      setMemory({ ...memory, ...updated });
      setShowCoreReasonModal(false);
      Alert.alert('Success', 'Memory marked as core');
    } catch (error) {
      Alert.alert('Error', 'Failed to mark as core');
    }
  };

  const handleToggleCore = async () => {
    if (!memory) return;
    
    const isCurrentlyCore = memory.isCore;
    
    if (!isCurrentlyCore) {
      // Marking as core - show modal for reason
      setCoreReasonInput('');
      setShowCoreReasonModal(true);
    } else {
      // Removing from core - confirm
      Alert.alert(
        'Remove from Core',
        'Remove this memory from your core memories?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                const updated = await memoryService.toggleCore(memory.id, false);
                setMemory({ ...memory, ...updated });
                Alert.alert('Success', 'Memory removed from core');
              } catch (error) {
                Alert.alert('Error', 'Failed to update memory');
              }
            },
          },
        ]
      );
    }
  };

  const handleEdit = () => {
    navigation.navigate('CreateMemory', { memory: memory, editMode: true });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Memory',
      'Are you sure you want to delete this memory? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await memoryService.deleteMemory(memory!.id);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete memory');
            }
          },
        },
      ]
    );
  };

  const handleAddToCollection = async () => {
    setShowCollectionModal(true);
    setLoadingCollections(true);
    try {
      const { owned, collaborated } = await collectionService.getUserCollections();
      setCollections([...owned, ...collaborated]);
    } catch (error) {
      console.error('Failed to load collections:', error);
      Alert.alert('Error', 'Failed to load collections');
    } finally {
      setLoadingCollections(false);
    }
  };

  const handleSelectCollection = async (collectionId: string) => {
    try {
      await collectionService.addMemoryToCollection(collectionId, memoryId);
      setShowCollectionModal(false);
      Alert.alert('Success', 'Memory added to collection');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to add memory to collection');
    }
  };

  const handleOpenCreateCollection = async () => {
    setShowCollectionModal(false);
    setShowCreateCollectionModal(true);
    try {
      const friendsList = await friendService.getFriends();
      setFriends(friendsList.filter(f => f.status === 'ACCEPTED'));
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      Alert.alert('Error', 'Please enter a collection name');
      return;
    }

    setCreatingCollection(true);
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

      // Add current memory to the new collection
      await collectionService.addMemoryToCollection(collection.id, memoryId);

      setShowCreateCollectionModal(false);
      setNewCollectionName('');
      setNewCollectionDescription('');
      setSelectedFriends([]);
      Alert.alert('Success', 'Collection created and memory added');
    } catch (error) {
      console.error('Failed to create collection:', error);
      Alert.alert('Error', 'Failed to create collection');
    } finally {
      setCreatingCollection(false);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const showOptionsMenu = () => {
    Alert.alert(
      'Memory Options',
      '',
      [
        { text: 'Share', onPress: handleShare },
        { text: 'Add to Collection', onPress: handleAddToCollection },
        ...(memory?.userId === user?.id
          ? [
              { text: 'Edit', onPress: handleEdit },
              { text: 'Delete', onPress: handleDelete, style: 'destructive' as const },
            ]
          : []),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const getPrivacyIcon = () => {
    switch (memory?.privacy) {
      case 'PRIVATE': return 'lock';
      case 'ONLY_TAGGED': return 'account-multiple';
      case 'FRIENDS': return 'account-group';
      case 'PUBLIC': return 'earth';
      default: return 'earth';
    }
  };

  const getPrivacyLabel = () => {
    switch (memory?.privacy) {
      case 'PRIVATE': return 'Private';
      case 'ONLY_TAGGED': return 'Tagged Only';
      case 'FRIENDS': return 'Friends';
      case 'PUBLIC': return 'Public';
      default: return 'Public';
    }
  };

  const renderComment = (comment: Comment, depth: number = 0) => {
    const isNested = depth > 0;
    const maxDepth = 3; // Limit nesting depth like Reddit
    
    return (
      <View key={comment.id}>
        <View style={[styles.commentItem, isNested && { marginLeft: 20 }]}>
          {/* Connection line for nested comments */}
          {isNested && <View style={styles.commentLine} />}
          
          <View style={styles.commentMain}>
            <TouchableOpacity
              style={styles.commentAvatar}
              onPress={() => {
                if (comment.user?.id && comment.user.id !== user?.id) {
                  navigation.navigate('FriendProfile', {
                    userId: comment.user.id,
                    userName: comment.user.username,
                  });
                }
              }}
            >
              {comment.user?.profilePicture ? (
                <Image
                  source={{ uri: comment.user.profilePicture }}
                  style={styles.commentAvatarImage}
                />
              ) : (
                <View style={styles.commentAvatarPlaceholder}>
                  <Text style={styles.commentAvatarText}>
                    {comment.user?.username?.[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
            <View style={styles.commentContent}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentUsername}>
                  {comment.user?.name || comment.user?.username || 'Unknown User'}
                </Text>
                <Text style={styles.commentTime}>{formatDate(comment.createdAt)}</Text>
              </View>
              <Text style={styles.commentText}>{comment.content}</Text>
              
              <View style={styles.commentActions}>
                {depth < maxDepth && (
                  <TouchableOpacity 
                    onPress={() => {
                      setReplyToComment(comment);
                      setShowReplyModal(true);
                    }}
                  >
                    <Text style={styles.commentActionText}>Reply</Text>
                  </TouchableOpacity>
                )}
                {comment.userId === user?.id && (
                  <TouchableOpacity
                    onPress={() => handleDeleteComment(comment.id)}
                    style={styles.commentDeleteAction}
                  >
                    <Text style={[styles.commentActionText, { color: '#ef4444' }]}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
        
        {/* Render nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </View>
        )}
      </View>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!memory) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Memory not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Memory</Text>
        <TouchableOpacity onPress={showOptionsMenu} style={styles.menuButton}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.userInfo}>
          <TouchableOpacity
            style={styles.userInfoLeft}
            onPress={() => {
              if (memory.user?.id && memory.user.id !== user?.id) {
                navigation.navigate('FriendProfile', {
                  userId: memory.user.id,
                  userName: memory.user.username,
                });
              } else if (memory.user?.id === user?.id) {
                navigation.navigate('Profile');
              }
            }}
          >
            {memory.user?.profilePicture ? (
              <Image source={{ uri: memory.user.profilePicture }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {(memory.user?.name || memory.user?.username)?.[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.userDetails}>
              <Text style={styles.username}>
                {memory.user?.name || memory.user?.username || 'Unknown User'}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.timestamp}>{formatDate(memory.createdAt)}</Text>
                {memory.memoryDate && (
                  <>
                    <Text style={styles.metaSeparator}>•</Text>
                    <MaterialCommunityIcons name="calendar" size={12} color="#9ca3af" />
                    <Text style={styles.memoryDate}>
                      {new Date(memory.memoryDate).toLocaleDateString()}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </TouchableOpacity>
          <View style={styles.privacyBadge}>
            <MaterialCommunityIcons name={getPrivacyIcon()} size={14} color="#6366f1" />
            <Text style={styles.privacyText}>{getPrivacyLabel()}</Text>
          </View>
        </View>

        {/* Title */}
        {memory.title && <Text style={styles.title}>{memory.title}</Text>}

        {/* Content */}
        {memory.content && (
          <View style={styles.contentSection}>
            <RenderHtml
              contentWidth={windowWidth - 48}
              source={{ html: memory.content }}
              tagsStyles={{
                body: { fontSize: 15, lineHeight: 22, color: '#374151' },
                p: { marginTop: 0, marginBottom: 12 },
                strong: { fontWeight: '600' },
                em: { fontStyle: 'italic' },
                ul: { paddingLeft: 20, marginBottom: 12 },
                ol: { paddingLeft: 20, marginBottom: 12 },
              }}
            />
          </View>
        )}

        {/* Audio Note */}
        {memory.audioUrl && (
          <TouchableOpacity
            style={styles.audioPlayerCard}
            onPress={async () => {
              try {
                console.log('Audio URL:', memory.audioUrl);
                if (isPlayingAudio) {
                  if (soundRef.current) {
                    await soundRef.current.stopAsync();
                    setIsPlayingAudio(false);
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
                  setIsPlayingAudio(true);
                  sound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded && status.didJustFinish) {
                      setIsPlayingAudio(false);
                    }
                  });
                }
              } catch (error) {
                console.error('Failed to play audio:', error);
              }
            }}
          >
            <View style={styles.audioPlayButtonLarge}>
              <MaterialCommunityIcons
                name={isPlayingAudio ? 'pause' : 'play'}
                size={24}
                color="#fff"
              />
            </View>
            <View style={styles.audioInfoDetail}>
              <Text style={styles.audioTitle}>Voice Note</Text>
              <Text style={styles.audioSubtitle}>
                {isPlayingAudio ? 'Playing...' : 'Tap to play'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Categories */}
        {memory.categories && memory.categories.length > 0 && (
          <View style={styles.categoriesRow}>
            {memory.categories.map((category) => (
              <View
                key={category.id}
                style={[
                  styles.categoryChip,
                  { backgroundColor: `${category.color}15`, borderColor: category.color }
                ]}
              >
                <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                <Text style={[styles.categoryChipText, { color: category.color }]}>
                  {category.name}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Photos Carousel */}
        {memory.photos && memory.photos.length > 0 && (
          <View style={styles.photosCarousel}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const index = Math.round(x / width);
                setPhotoCarouselIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {memory.photos.map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.carouselItem}
                  activeOpacity={0.95}
                  onPress={() => {
                    setImageViewerIndex(index);
                    setImageViewerVisible(true);
                  }}
                >
                  <Image source={{ uri: photo }} style={styles.carouselPhoto} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
            {memory.photos.length > 1 && (
              <View style={styles.carouselIndicator}>
                {memory.photos.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicatorDot,
                      index === photoCarouselIndex && styles.indicatorDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        <ImageView
          images={memory.photos ? memory.photos.map(uri => ({ uri })) : []}
          imageIndex={imageViewerIndex}
          visible={imageViewerVisible}
          onRequestClose={() => setImageViewerVisible(false)}
          swipeToCloseEnabled={true}
          doubleTapToZoomEnabled={true}
        />

        {/* Tagged Friends */}
        {memory.taggedFriends && memory.taggedFriends.length > 0 && (
          <View style={styles.taggedFriendsContainer}>
            <View style={styles.taggedHeader}>
              <MaterialCommunityIcons name="account-multiple" size={16} color="#6366f1" />
              <Text style={styles.sectionLabel}>With:</Text>
            </View>
            <View style={styles.taggedList}>
              {memory.taggedFriends.map((friend: any) => (
                <TouchableOpacity
                  key={friend.id}
                  style={styles.taggedFriendChip}
                  onPress={() => {
                    if (friend.id !== user?.id) {
                      navigation.navigate('FriendProfile', {
                        userId: friend.id,
                        userName: friend.username,
                      });
                    }
                  }}
                >
                  {friend.profilePicture ? (
                    <Image source={{ uri: friend.profilePicture }} style={styles.taggedAvatar} />
                  ) : (
                    <View style={styles.taggedAvatarPlaceholder}>
                      <Text style={styles.taggedAvatarText}>
                        {friend.username?.[0]?.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.taggedName}>{friend.username}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Moods/Tags */}
        {memory.moods && memory.moods.length > 0 && (
          <View style={styles.moodsContainer}>
            <MaterialCommunityIcons name="tag-multiple" size={16} color="#6366f1" />
            <View style={styles.tagsWrapper}>
              {memory.moods.map((mood, index) => (
                <View key={index} style={styles.moodChip}>
                  <Text style={styles.moodText}>{mood}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Location */}
        {memory.location && (
          <View style={styles.locationContainer}>
            <MaterialCommunityIcons name="map-marker" size={16} color="#6b7280" />
            <Text style={styles.locationText}>{memory.location}</Text>
          </View>
        )}

        {/* Compact Actions Bar */}
        <View style={styles.actionsBar}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => setShowReactionsModal(true)}
          >
            <MaterialCommunityIcons name="heart-outline" size={22} color="#6b7280" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              // Scroll to comments - for now just a visual indicator
            }}
          >
            <MaterialCommunityIcons name="comment-outline" size={22} color="#6b7280" />
            {comments.length > 0 && (
              <Text style={styles.actionText}>{comments.length}</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <MaterialCommunityIcons name="share-variant-outline" size={22} color="#6b7280" />
          </TouchableOpacity>

          {memory.userId === user?.id && (
            <TouchableOpacity style={styles.actionButton} onPress={handleToggleCore}>
              <MaterialCommunityIcons 
                name={memory.isCore ? "star" : "star-outline"} 
                size={22} 
                color={memory.isCore ? "#f59e0b" : "#6b7280"} 
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            <MaterialCommunityIcons name="comment-multiple" size={20} color="#1f2937" /> Comments ({comments.length})
          </Text>

          {comments.map((comment) => renderComment(comment, 0))}

          {comments.length === 0 && (
            <View style={styles.emptyComments}>
              <View style={styles.emptyCommentsIcon}>
                <MaterialCommunityIcons name="comment-outline" size={48} color="#d1d5db" />
              </View>
              <Text style={styles.emptyCommentsText}>No comments yet</Text>
              <Text style={styles.emptyCommentsSubtext}>
                Be the first to share your thoughts!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Comment Input - Only for top-level comments */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.inputAvatar}>
            {user?.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.inputAvatarImage} />
            ) : (
              <View style={styles.inputAvatarPlaceholder}>
                <Text style={styles.inputAvatarText}>
                  {user?.username?.[0]?.toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Write a comment..."
              placeholderTextColor="#9ca3af"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <Text style={styles.charCount}>{commentText.length}/500</Text>
          </View>
          <TouchableOpacity
            onPress={handleAddComment}
            disabled={!commentText.trim() || submitting}
            style={[
              styles.sendButton,
              (!commentText.trim() || submitting) && styles.sendButtonDisabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialCommunityIcons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Add to Collection Modal */}
      <Modal
        visible={showCollectionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCollectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Collection</Text>
              <TouchableOpacity onPress={() => setShowCollectionModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {loadingCollections ? (
              <ActivityIndicator size="large" color="#4A90E2" style={{ marginVertical: 40 }} />
            ) : (
              <FlatList
                data={collections}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.collectionItem}
                    onPress={() => handleSelectCollection(item.id)}
                  >
                    <View style={styles.collectionInfo}>
                      {item.coverImage || item.memories?.[0]?.memory?.photos?.[0] ? (
                        <Image
                          source={{ uri: item.coverImage || item.memories[0].memory.photos[0] }}
                          style={styles.collectionThumbnail}
                        />
                      ) : (
                        <View style={[styles.collectionThumbnail, styles.placeholderThumbnail]}>
                          <MaterialCommunityIcons name="image-multiple-outline" size={24} color="#999" />
                        </View>
                      )}
                      <View style={styles.collectionText}>
                        <Text style={styles.collectionName}>{item.name}</Text>
                        <Text style={styles.collectionMeta}>
                          {item._count?.memories || 0} memories
                        </Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="folder-multiple-image" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>No collections yet</Text>
                    <TouchableOpacity
                      style={styles.createButton}
                      onPress={handleOpenCreateCollection}
                    >
                      <Text style={styles.createButtonText}>Create Collection</Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Create Collection Modal */}
      <Modal
        visible={showCreateCollectionModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateCollectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Collection</Text>
              <TouchableOpacity onPress={() => setShowCreateCollectionModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.createInput}
                placeholder="Collection name"
                placeholderTextColor="#999"
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                autoFocus
              />

              <TextInput
                style={[styles.createInput, styles.textArea]}
                placeholder="Description (optional)"
                placeholderTextColor="#999"
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
                              {friend.name || friend.username}
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
            </ScrollView>

            <TouchableOpacity
              style={[styles.createCollectionBtn, creatingCollection && styles.createCollectionBtnDisabled]}
              onPress={handleCreateCollection}
              disabled={creatingCollection}
            >
              <Text style={styles.createCollectionBtnText}>
                {creatingCollection ? 'Creating...' : 'Create & Add Memory'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reactions Modal */}
      <Modal
        visible={showReactionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReactionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1}
            onPress={() => setShowReactionsModal(false)}
          />
          <View style={styles.reactionsModalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.reactionsModalTitle}>React to this memory</Text>
            <Text style={styles.reactionsModalSubtitle}>Choose a meaningful response</Text>
            
            <View style={styles.reactionsGrid}>
              {REACTION_OPTIONS.map((option) => {
                const userReacted = reactions.some(
                  (r) => r.type === option.type && r.userId === user?.id
                );
                
                return (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.reactionModalButton,
                      userReacted && styles.reactionModalButtonActive,
                    ]}
                    onPress={() => {
                      handleReaction(option.type);
                      setShowReactionsModal(false);
                    }}
                  >
                    <MaterialCommunityIcons 
                      name={option.icon} 
                      size={32} 
                      color={userReacted ? '#6366f1' : '#6b7280'}
                    />
                    <Text style={[
                      styles.reactionModalLabel,
                      userReacted && styles.reactionModalLabelActive,
                    ]}>
                      {option.label}
                    </Text>
                    {option.description && (
                      <Text style={styles.reactionModalDescription}>
                        {option.description}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            
            {reactions.length > 0 && (
              <>
                <View style={styles.reactionsDivider} />
                <Text style={styles.reactionsListTitle}>People who reacted</Text>
                <ScrollView style={styles.reactionsList}>
                  {Object.entries(
                    reactions.reduce((acc, r) => {
                      if (!acc[r.type]) acc[r.type] = [];
                      acc[r.type].push(r);
                      return acc;
                    }, {} as { [key: string]: Reaction[] })
                  ).map(([type, reactionList]) => (
                    <View key={type} style={styles.reactionGroup}>
                      <View style={styles.reactionGroupHeader}>
                        <MaterialCommunityIcons 
                          name={getReactionIcon(type as ReactionType)} 
                          size={20} 
                          color="#6366f1"
                        />
                        <Text style={styles.reactionGroupLabel}>
                          {getReactionLabel(type as ReactionType)}
                        </Text>
                      </View>
                      <View style={styles.reactionGroupUsers}>
                        {reactionList.map((r) => (
                          <Text key={r.id} style={styles.reactionGroupUser}>
                            {r.user?.name || r.user?.username || 'Someone'}
                          </Text>
                        ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Reply Modal */}
      <Modal
        visible={showReplyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowReplyModal(false);
          setReplyToComment(null);
          setCommentText('');
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1}
            onPress={() => {
              setShowReplyModal(false);
              setReplyToComment(null);
              setCommentText('');
            }}
          />
          <View style={styles.replyModalContent}>
            <View style={styles.modalHandle} />
            
            <ScrollView 
              style={styles.replyModalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.replyModalHeader}>
                <Text style={styles.replyModalTitle}>Reply to {replyToComment?.user?.name || replyToComment?.user?.username}</Text>
                <TouchableOpacity onPress={() => {
                  setShowReplyModal(false);
                  setReplyToComment(null);
                  setCommentText('');
                }}>
                  <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Original Comment */}
              {replyToComment && (
                <View style={styles.originalComment}>
                  <View style={styles.originalCommentHeader}>
                    {replyToComment.user?.profilePicture ? (
                      <Image
                        source={{ uri: replyToComment.user.profilePicture }}
                        style={styles.originalCommentAvatar}
                      />
                    ) : (
                      <View style={[styles.originalCommentAvatar, styles.avatarPlaceholder, { width: 32, height: 32, borderRadius: 16 }]}>
                        <Text style={[styles.avatarText, { fontSize: 14 }]}>
                          {replyToComment.user?.username?.[0]?.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.originalCommentUsername}>
                      {replyToComment.user?.name || replyToComment.user?.username}
                    </Text>
                  </View>
                  <Text style={styles.originalCommentText} numberOfLines={3}>
                    {replyToComment.content}
                  </Text>
                </View>
              )}

              {/* Reply Input */}
              <View style={styles.replyInputContainer}>
                <View style={styles.replyInputHeader}>
                  {user?.profilePicture ? (
                    <Image source={{ uri: user.profilePicture }} style={styles.replyUserAvatar} />
                  ) : (
                    <View style={[styles.replyUserAvatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>
                        {user?.username?.[0]?.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.replyInputLabel}>Your reply</Text>
                </View>
                
                <TextInput
                  style={styles.replyInput}
                  placeholder="Write your reply..."
                  placeholderTextColor="#9ca3af"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                  autoFocus
                />
                <Text style={styles.replyCharCount}>{commentText.length}/500</Text>
              </View>
            </ScrollView>

            {/* Reply Button - Fixed at bottom */}
            <View style={styles.replyButtonContainer}>
              <TouchableOpacity
                onPress={handleAddComment}
                disabled={!commentText.trim() || submitting}
                style={[
                  styles.replySubmitButton,
                  (!commentText.trim() || submitting) && styles.replySubmitButtonDisabled,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.replySubmitButtonText}>Post Reply</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Core Memory Reason Modal */}
      <Modal
        visible={showCoreReasonModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCoreReasonModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.coreReasonModalCard}>
            <View style={styles.coreReasonModalHeader}>
              <Text style={styles.coreReasonModalTitle}>⭐ Core Memory</Text>
              <TouchableOpacity onPress={() => setShowCoreReasonModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.coreReasonModalLabel}>
              Why is this memory important to you? (optional)
            </Text>
            <TextInput
              style={styles.coreReasonModalInput}
              placeholder="This memory means a lot to me because..."
              placeholderTextColor="#9ca3af"
              value={coreReasonInput}
              onChangeText={setCoreReasonInput}
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            <View style={styles.coreReasonModalActions}>
              <TouchableOpacity
                style={styles.coreReasonModalButtonOutline}
                onPress={() => setShowCoreReasonModal(false)}
              >
                <Text style={styles.coreReasonModalButtonTextOutline}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.coreReasonModalButton}
                onPress={saveCoreMemory}
              >
                <Text style={styles.coreReasonModalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  menuButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  userInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestamp: {
    fontSize: 13,
    color: '#6b7280',
  },
  metaSeparator: {
    fontSize: 12,
    color: '#d1d5db',
  },
  memoryDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  privacyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
  },
  contentSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
  },
  audioPlayerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#eff6ff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  audioPlayButtonLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioInfoDetail: {
    flex: 1,
  },
  audioTitle: {
    fontSize: 15,
    color: '#1e40af',
    fontWeight: '600',
  },
  audioSubtitle: {
    fontSize: 13,
    color: '#60a5fa',
    marginTop: 2,
  },
  contentText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  readMoreButton: {
    marginTop: 8,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    borderLeftWidth: 4,
    paddingLeft: 10,
    paddingRight: 12,
    paddingVertical: 6,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  photosContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoWrapper: {
    width: (width - 40) / 2,
    height: (width - 40) / 2,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    position: 'relative',
  },
  photoWrapperSingle: {
    width: width - 32,
    height: width * 0.75,
  },
  photoWrapperPair: {
    width: (width - 40) / 2,
    height: (width - 40) / 1.5,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 6,
  },
  taggedFriendsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  taggedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  taggedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  taggedFriendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  taggedAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  taggedAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taggedAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  taggedName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  moodsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  moodChip: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  moodText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6366f1',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  locationText: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statsLeft: {
    flexDirection: 'row',
    gap: 20,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366f1',
    letterSpacing: 0.2,
  },
  divider: {
    height: 8,
    backgroundColor: '#f3f4f6',
  },
  reactionsContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  reactionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
  },
  reactionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reactionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 28,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    minWidth: 64,
  },
  reactionButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  reactionEmoji: {
    fontSize: 32,
  },
  reactionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  reactionBadgeActive: {
    backgroundColor: '#3b82f6',
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  reactionCountActive: {
    color: '#ffffff',
  },
  commentsSection: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  commentsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  commentItem: {
    position: 'relative',
    marginBottom: 12,
  },
  commentLine: {
    position: 'absolute',
    left: -12,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#e5e7eb',
  },
  commentMain: {
    flexDirection: 'row',
    gap: 12,
  },
  repliesContainer: {
    marginTop: 0,
  },
  commentAvatar: {
    width: 40,
    height: 40,
  },
  commentAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  commentTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 6,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  commentActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  commentDeleteAction: {
    marginLeft: 4,
  },
  deleteButton: {
    padding: 8,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyCommentsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyCommentsText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6b7280',
    marginTop: 12,
    letterSpacing: -0.3,
  },
  emptyCommentsSubtext: {
    fontSize: 15,
    color: '#9ca3af',
    marginTop: 8,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  inputAvatar: {
    width: 36,
    height: 36,
  },
  inputAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  inputAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    color: '#1f2937',
  },
  charCount: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
    marginLeft: 16,
  },
  sendButton: {
    backgroundColor: '#6366f1',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    padding: 20,
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
    color: '#1f2937',
  },
  collectionItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  collectionInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  collectionThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  placeholderThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectionText: {
    marginLeft: 12,
    flex: 1,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  collectionMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  createInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    color: '#1f2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  friendsSection: {
    marginTop: 8,
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
  createCollectionBtn: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  createCollectionBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  createCollectionBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // New compact action bar styles
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  // Photo carousel styles
  photosCarousel: {
    backgroundColor: '#000',
  },
  carouselItem: {
    width: width,
    height: width * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselPhoto: {
    width: '100%',
    height: '100%',
  },
  carouselIndicator: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorDotActive: {
    backgroundColor: '#ffffff',
    width: 20,
  },
  // Improved category styles
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
  },
  // Reactions modal styles
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  reactionsModalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  reactionsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  reactionsModalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  reactionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 16,
    justifyContent: 'center',
  },
  reactionModalButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  reactionModalButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#6366f1',
  },
  reactionModalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  reactionModalLabelActive: {
    color: '#6366f1',
  },
  reactionModalDescription: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  reactionsDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 20,
    marginHorizontal: 20,
  },
  reactionsListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  reactionsList: {
    maxHeight: 200,
    paddingHorizontal: 20,
  },
  reactionGroup: {
    marginBottom: 16,
  },
  reactionGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  reactionGroupLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  reactionGroupUsers: {
    paddingLeft: 28,
  },
  reactionGroupUser: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  // Reply modal styles
  replyModalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: '80%',
    display: 'flex',
    flexDirection: 'column',
  },
  replyModalScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  replyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  replyModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  originalComment: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  originalCommentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  originalCommentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  originalCommentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  originalCommentText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  replyInputContainer: {
    marginBottom: 20,
  },
  replyInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  replyUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  replyInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  replyInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  replyCharCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 6,
  },
  replyButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  replySubmitButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  replySubmitButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  replySubmitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Core Memory Reason Modal
  coreReasonModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '92%',
    maxWidth: 500,
  },
  coreReasonModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  coreReasonModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  coreReasonModalLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  coreReasonModalInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  coreReasonModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  coreReasonModalButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  coreReasonModalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  coreReasonModalButtonOutline: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  coreReasonModalButtonTextOutline: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
});
