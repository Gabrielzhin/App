import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as ImageManipulator from 'expo-image-manipulator';
import { Audio } from 'expo-av';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { memoryService, categoryService } from '../../services/memory';
import { uploadService } from '../../services/upload';
import { friendService, Friendship } from '../../services/friend';
import { useCategories, useFriends } from '../../hooks/useQueries';
import { Category, User } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Calendar helper functions
const getDaysInMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  return new Date(year, month, 1).getDay();
};

const isSameDay = (date1: Date, date2: Date) => {
  return date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear();
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CreateMemoryScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const groupId = route?.params?.groupId;
  const groupName = route?.params?.groupName;
  const existingMemory = route?.params?.memory; // For editing
  const initialTaggedFriends = route?.params?.taggedFriends || []; // Pre-tagged friends
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Diary content
  const [title, setTitle] = useState(existingMemory?.title || '');
  const [content, setContent] = useState(existingMemory?.content || '');
  const [memoryDate, setMemoryDate] = useState(existingMemory?.memoryDate ? new Date(existingMemory.memoryDate) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date()); // The month/year being viewed in calendar
  
  // Step 2: Metadata
  const [photos, setPhotos] = useState<string[]>(existingMemory?.photos || []);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [privacy, setPrivacy] = useState<'PRIVATE' | 'ONLY_TAGGED' | 'FRIENDS' | 'PUBLIC'>(existingMemory?.privacy || 'FRIENDS');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(existingMemory?.categories?.map((c: any) => c.category.id) || []);
  const [moods, setMoods] = useState<string[]>(existingMemory?.moods || []);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [showPrivacyDropdown, setShowPrivacyDropdown] = useState(false);
  
  // Use React Query for categories and friends
  const { data: categoriesData } = useCategories();
  const { data: friendsData } = useFriends();
  const categories = categoriesData || [];
  const friends = friendsData?.friends || [];
  
  const [taggedFriends, setTaggedFriends] = useState<string[]>(initialTaggedFriends);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [isCore, setIsCore] = useState(false);
  const [coreReason, setCoreReason] = useState('');
  const [showCoreReasonModal, setShowCoreReasonModal] = useState(false);
  
  // Location
  const [location, setLocation] = useState<{latitude: number; longitude: number; address?: string} | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  
  // Rich text editor
  const richTextRef = useRef<RichEditor>(null);
  
  // Image editor
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingImageUri, setEditingImageUri] = useState<string | null>(null);
  const [imageRotation, setImageRotation] = useState(0);
  
  // Voice notes
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // New category creation
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6366f1');
  const [newCategoryIcon, setNewCategoryIcon] = useState('bookmark');

  // Mood presets
  const moodPresets = [
    { emoji: '😊', label: 'Happy' },
    { emoji: '😍', label: 'Loved' },
    { emoji: '😎', label: 'Cool' },
    { emoji: '🤗', label: 'Grateful' },
    { emoji: '😌', label: 'Peaceful' },
    { emoji: '🥳', label: 'Celebrating' },
    { emoji: '😔', label: 'Sad' },
    { emoji: '😤', label: 'Frustrated' },
    { emoji: '🤔', label: 'Thoughtful' },
    { emoji: '😴', label: 'Tired' },
    { emoji: '🔥', label: 'Energized' },
    { emoji: '💪', label: 'Motivated' },
  ];

  // Color presets for category creation
  const colorPresets = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f59e0b', '#10b981', '#06b6d4', '#6b7280',
  ];

  // Icon presets for category creation
  const iconPresets = [
    'bookmark', 'heart', 'star', 'briefcase', 'school',
    'home', 'coffee', 'food', 'airplane', 'music',
    'camera', 'book', 'dumbbell', 'gift', 'palette',
  ];

  const checkPermission = () => {
    if (user?.mode === 'RESTRICTED') {
      Alert.alert(
        'Upgrade Required',
        'You need to upgrade to create memories.',
        [
          { text: 'Later', style: 'cancel' },
          { 
            text: 'Upgrade', 
            onPress: () => navigation.navigate('ProfileTab', { 
              screen: 'PricingScreen' 
            })
          }
        ]
      );
      return false;
    }
    return true;
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleFriend = (friendId: string) => {
    setTaggedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const toggleMood = (mood: string) => {
    setMoods((prev) =>
      prev.includes(mood)
        ? prev.filter((m) => m !== mood)
        : [...prev, mood]
    );
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
      });
    }
  };

  const pickImage = async () => {
    if (!checkPermission()) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10 - photos.length,
    });

    if (!result.canceled) {
      setUploading(true);
      try {
        const uploadedUrls = await uploadService.uploadMultiplePhotos(
          result.assets.map((asset) => asset.uri)
        );
        setPhotos([...photos, ...uploadedUrls.map((u) => u.url)]);
      } catch (error) {
        Alert.alert('Upload failed', 'Could not upload photos');
        console.error(error);
      } finally {
        setUploading(false);
      }
    }
  };

  const takePhoto = async () => {
    if (!checkPermission()) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled) {
      setUploading(true);
      try {
        const uploaded = await uploadService.uploadPhoto(result.assets[0].uri);
        setPhotos([...photos, uploaded.url]);
      } catch (error) {
        Alert.alert('Upload failed', 'Could not upload photo');
        console.error(error);
      } finally {
        setUploading(false);
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    if (currentPhotoIndex >= photos.length - 1) {
      setCurrentPhotoIndex(Math.max(0, photos.length - 2));
    }
  };

  const getLocation = async () => {
    if (!checkPermission()) return;

    try {
      setLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your location');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = currentLocation.coords;
      
      // Reverse geocode to get address
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      const address = addresses[0];
      const formattedAddress = address 
        ? `${address.city}, ${address.region}, ${address.country}`
        : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

      setLocation({
        latitude,
        longitude,
        address: formattedAddress
      });
    } catch (error) {
      Alert.alert('Error', 'Could not get location');
      console.error(error);
    } finally {
      setLoadingLocation(false);
    }
  };

  const removeLocation = () => {
    setLocation(null);
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone access to record voice notes.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 1;
          // Auto-stop at 5 minutes (300 seconds)
          if (newDuration >= 300) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      
      if (uri) {
        // Upload audio file
        const uploadedAudio = await uploadService.uploadPhoto(uri);
        setAudioUrl(uploadedAudio.url);
      }

      recordingRef.current = null;
      setIsRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to save recording.');
      setIsRecording(false);
    }
  };

  const cancelRecording = async () => {
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

      setIsRecording(false);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  };

  const deleteAudio = () => {
    setAudioUrl(null);
    setRecordingDuration(0);
  };

  const playAudio = async () => {
    try {
      if (!audioUrl) return;

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );

      soundRef.current = sound;
      setIsPlayingAudio(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlayingAudio(false);
        }
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
      Alert.alert('Error', 'Failed to play audio.');
    }
  };

  const stopAudio = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        setIsPlayingAudio(false);
      }
    } catch (error) {
      console.error('Failed to stop audio:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const createNewCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      const newCategory = await categoryService.createCategory(
        newCategoryName.trim(),
        newCategoryColor,
        newCategoryIcon
      );
      
      setCategories([...categories, newCategory]);
      setSelectedCategories([...selectedCategories, newCategory.id]);
      setNewCategoryName('');
      setNewCategoryColor('#6366f1');
      setNewCategoryIcon('bookmark');
      setShowCreateCategoryModal(false);
      setShowCategoryModal(false);
      
      Alert.alert('Success', 'Category created!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Could not create category');
    }
  };

  const goToNextStep = () => {
    if (!title.trim() && !audioUrl) {
      Alert.alert('Missing Content', 'Please add a title or record a voice note');
      return;
    }
    setCurrentStep(2);
  };

  const goToPreviousStep = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    if (!checkPermission()) return;

    if (!title.trim() && !audioUrl) {
      Alert.alert('Error', 'Please add a title or voice note');
      return;
    }

    setLoading(true);
    try {
      const newMemory = await memoryService.createMemory({
        title: title.trim(),
        content: content.trim() || undefined,
        photos,
        audioUrl: audioUrl || undefined,
        privacy: groupId ? 'PUBLIC' : privacy,
        categoryIds: selectedCategories,
        moods: moods,
        memoryDate: memoryDate.toISOString(),
        groupId: groupId || undefined,
        taggedUserIds: taggedFriends,
      });

      // If marked as core, update it after creation
      if (isCore && newMemory.id) {
        await memoryService.toggleCore(newMemory.id, true, coreReason || undefined);
      }

      // Reset form
      setCurrentStep(1);
      setTitle('');
      setContent('');
      setMemoryDate(new Date());
      setPhotos([]);
      setCurrentPhotoIndex(0);
      setPrivacy('FRIENDS');
      setSelectedCategories([]);
      setMoods([]);
      setTaggedFriends([]);
      setFriendSearchQuery('');
      setIsCore(false);
      setCoreReason('');
      setAudioUrl(null);
      setRecordingDuration(0);
      
      Alert.alert('Success', 'Memory created!', [
        {
          text: 'OK',
          onPress: () => {
            if (groupId) {
              navigation.navigate('GroupsTab', { 
                screen: 'GroupDetail', 
                params: { groupId } 
              });
            } else {
              navigation.navigate('MainTabs');
            }
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Could not create memory');
    } finally {
      setLoading(false);
    }
  };

  const isRestricted = user?.mode === 'RESTRICTED';

  const filteredFriends = friends.filter((f) => {
    const friend = f.friend || f.user;
    return friend?.username?.toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
           friend?.displayName?.toLowerCase().includes(friendSearchQuery.toLowerCase());
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => currentStep === 2 ? goToPreviousStep() : navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {groupName ? `Post to ${groupName}` : currentStep === 1 ? 'Write Memory' : 'Add Details'}
          </Text>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, currentStep === 1 && styles.stepDotActive]} />
            <View style={[styles.stepDot, currentStep === 2 && styles.stepDotActive]} />
          </View>
        </View>

        {currentStep === 1 ? (
          <TouchableOpacity
            style={[styles.nextButton, !title.trim() && styles.nextButtonDisabled]}
            onPress={goToNextStep}
            disabled={!title.trim() || isRestricted}
          >
            <Text style={[styles.nextButtonText, !title.trim() && styles.nextButtonTextDisabled]}>
              Next
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading || isRestricted}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Post</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {isRestricted && (
        <View style={styles.restrictedBanner}>
          <MaterialCommunityIcons name="lock" size={20} color="#92400e" />
          <Text style={styles.restrictedText}>Upgrade to create memories</Text>
        </View>
      )}

      {/* Step 1: Diary Page */}
      {currentStep === 1 && (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.diaryContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Date Picker Button - Improved with gradient */}
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
            disabled={isRestricted}
          >
            <View style={styles.dateBadge}>
              <MaterialCommunityIcons name="calendar-today" size={18} color="#fff" />
            </View>
            <Text style={styles.dateButtonText}>{formatDate(memoryDate)}</Text>
            <MaterialCommunityIcons name="chevron-down" size={16} color="#6366f1" />
          </TouchableOpacity>

          {/* Title Input - Improved with underline */}
          <View style={styles.titleContainer}>
            <TextInput
              style={styles.titleInput}
              placeholder="Give it a title..."
              value={title}
              onChangeText={setTitle}
              editable={!isRestricted}
              placeholderTextColor="#9ca3af"
            />
            <View style={styles.titleUnderline} />
          </View>

          {/* Rich Text Toolbar */}
          <RichToolbar
            editor={richTextRef}
            actions={[
              actions.setBold,
              actions.setItalic,
              actions.insertBulletsList,
              actions.insertOrderedList,
            ]}
            iconMap={{
              [actions.setBold]: () => <MaterialCommunityIcons name="format-bold" size={20} color="#1f2937" />,
              [actions.setItalic]: () => <MaterialCommunityIcons name="format-italic" size={20} color="#1f2937" />,
              [actions.insertBulletsList]: () => <MaterialCommunityIcons name="format-list-bulleted" size={20} color="#1f2937" />,
              [actions.insertOrderedList]: () => <MaterialCommunityIcons name="format-list-numbered" size={20} color="#1f2937" />,
            }}
            style={styles.richToolbar}
            selectedButtonStyle={styles.richToolbarSelected}
            selectedIconTint="#6366f1"
          />

          {/* Location Badge */}
          {location && (
            <View style={styles.locationBadge}>
              <MaterialCommunityIcons name="map-marker" size={16} color="#065f46" />
              <Text style={styles.locationText} numberOfLines={1}>{location.address}</Text>
              <TouchableOpacity onPress={removeLocation}>
                <MaterialCommunityIcons name="close-circle" size={16} color="#065f46" />
              </TouchableOpacity>
            </View>
          )}

          {/* Rich Text Editor */}
          <RichEditor
            ref={richTextRef}
            initialContentHTML={content}
            onChange={setContent}
            placeholder="Dear diary,

Today was..."
            style={styles.richEditor}
            editorStyle={{
              backgroundColor: '#fff',
              color: '#374151',
              placeholderColor: '#d1d5db',
              contentCSSText: 'font-size: 16px; line-height: 24px; font-family: system-ui; padding: 0;',
            }}
            disabled={isRestricted}
          />

          {/* Location and Voice Notes Buttons */}
          <View style={styles.diaryActions}>
            <TouchableOpacity
              style={styles.diaryActionButton}
              onPress={getLocation}
              disabled={loadingLocation}
            >
              {loadingLocation ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <>
                  <MaterialCommunityIcons name="map-marker" size={20} color={location ? '#10b981' : '#6366f1'} />
                  <Text style={styles.diaryActionText}>
                    {location ? 'Location Added' : 'Add Location'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {!audioUrl && !isRecording && (
              <TouchableOpacity
                style={styles.diaryActionButton}
                onPress={startRecording}
              >
                <MaterialCommunityIcons name="microphone" size={20} color="#6366f1" />
                <Text style={styles.diaryActionText}>Voice Note</Text>
              </TouchableOpacity>
            )}

            {isRecording && (
              <View style={styles.recordingContainer}>
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>
                    {formatDuration(recordingDuration)} / 5:00
                  </Text>
                </View>
                <View style={styles.recordingButtons}>
                  <TouchableOpacity onPress={cancelRecording} style={styles.recordingCancelBtn}>
                    <MaterialCommunityIcons name="close" size={20} color="#ef4444" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={stopRecording} style={styles.recordingStopBtn}>
                    <MaterialCommunityIcons name="stop" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {audioUrl && !isRecording && (
              <View style={styles.audioPlayerContainer}>
                <TouchableOpacity
                  onPress={isPlayingAudio ? stopAudio : playAudio}
                  style={styles.audioPlayButton}
                >
                  <MaterialCommunityIcons
                    name={isPlayingAudio ? 'pause' : 'play'}
                    size={20}
                    color="#fff"
                  />
                </TouchableOpacity>
                <View style={styles.audioInfo}>
                  <Text style={styles.audioLabel}>Voice note</Text>
                  <Text style={styles.audioDuration}>{formatDuration(recordingDuration)}</Text>
                </View>
                <TouchableOpacity onPress={deleteAudio} style={styles.audioDeleteButton}>
                  <MaterialCommunityIcons name="delete-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.diaryHintCard}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color="#f59e0b" />
            <Text style={styles.diaryHint}>
              Write freely. You can add photos and details in the next step.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Step 2: Metadata Page */}
      {currentStep === 2 && (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.metadataContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Photos Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="image-multiple" size={20} color="#6366f1" />
              <Text style={styles.sectionTitle}>Photos</Text>
              <Text style={styles.sectionCount}>({photos.length})</Text>
            </View>

            {photos.length > 0 ? (
              <View style={styles.photoCarouselContainer}>
                <Image
                  source={{ uri: photos[currentPhotoIndex] }}
                  style={styles.photoCarousel}
                  resizeMode="cover"
                />
                
                {/* Photo Controls */}
                <View style={styles.photoControls}>
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(currentPhotoIndex)}
                  >
                    <MaterialCommunityIcons name="delete" size={20} color="#fff" />
                  </TouchableOpacity>

                  {photos.length > 1 && (
                    <View style={styles.photoNavigation}>
                      <TouchableOpacity
                        onPress={() => setCurrentPhotoIndex(Math.max(0, currentPhotoIndex - 1))}
                        disabled={currentPhotoIndex === 0}
                      >
                        <MaterialCommunityIcons
                          name="chevron-left"
                          size={32}
                          color={currentPhotoIndex === 0 ? '#9ca3af' : '#fff'}
                        />
                      </TouchableOpacity>
                      
                      <Text style={styles.photoCounter}>
                        {currentPhotoIndex + 1} / {photos.length}
                      </Text>
                      
                      <TouchableOpacity
                        onPress={() => setCurrentPhotoIndex(Math.min(photos.length - 1, currentPhotoIndex + 1))}
                        disabled={currentPhotoIndex === photos.length - 1}
                      >
                        <MaterialCommunityIcons
                          name="chevron-right"
                          size={32}
                          color={currentPhotoIndex === photos.length - 1 ? '#9ca3af' : '#fff'}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Photo Dots Indicator */}
                {photos.length > 1 && (
                  <View style={styles.photoDots}>
                    {photos.map((_, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => setCurrentPhotoIndex(index)}
                        style={[
                          styles.photoDot,
                          index === currentPhotoIndex && styles.photoDotActive,
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyPhotoContainer}>
                <MaterialCommunityIcons name="image-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyPhotoText}>No photos yet</Text>
              </View>
            )}

            {/* Add Photo Buttons */}
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={styles.photoActionButton}
                onPress={pickImage}
                disabled={isRestricted || uploading}
              >
                <MaterialCommunityIcons name="image-plus" size={20} color={isRestricted ? '#d1d5db' : '#6366f1'} />
                <Text style={[styles.photoActionText, isRestricted && styles.photoActionTextDisabled]}>
                  Gallery
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoActionButton}
                onPress={takePhoto}
                disabled={isRestricted || uploading}
              >
                <MaterialCommunityIcons name="camera-plus" size={20} color={isRestricted ? '#d1d5db' : '#6366f1'} />
                <Text style={[styles.photoActionText, isRestricted && styles.photoActionTextDisabled]}>
                  Camera
                </Text>
              </TouchableOpacity>
            </View>

            {uploading && (
              <View style={styles.uploadingIndicator}>
                <ActivityIndicator color="#6366f1" />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            )}
          </View>

          {/* Categories Section - Improved Card Design */}
          <TouchableOpacity
            style={styles.metadataCard}
            onPress={() => setShowCategoryModal(true)}
            disabled={isRestricted}
          >
            <View style={styles.metadataCardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: '#eef2ff' }]}>
                <MaterialCommunityIcons name="bookmark-multiple" size={20} color="#6366f1" />
              </View>
              <View style={styles.metadataCardContent}>
                <Text style={styles.metadataCardTitle}>Categories</Text>
                {selectedCategories.length > 0 ? (
                  <View style={styles.selectedChips}>
                    {selectedCategories.slice(0, 3).map((catId) => {
                      const category = categories.find((c) => c.id === catId);
                      return category ? (
                        <View
                          key={catId}
                          style={[styles.miniChip, { backgroundColor: category.color + '20', borderColor: category.color }]}
                        >
                          <MaterialCommunityIcons name={category.icon} size={12} color={category.color} />
                          <Text style={[styles.miniChipText, { color: category.color }]}>{category.name}</Text>
                        </View>
                      ) : null;
                    })}
                    {selectedCategories.length > 3 && (
                      <Text style={styles.moreCount}>+{selectedCategories.length - 3}</Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.metadataCardPlaceholder}>Tap to add categories</Text>
                )}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
            </View>
          </TouchableOpacity>

          {/* Moods Section - Improved Card Design */}
          <TouchableOpacity
            style={styles.metadataCard}
            onPress={() => setShowMoodModal(true)}
            disabled={isRestricted}
          >
            <View style={styles.metadataCardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: '#fef3c7' }]}>
                <MaterialCommunityIcons name="emoticon-happy" size={20} color="#f59e0b" />
              </View>
              <View style={styles.metadataCardContent}>
                <Text style={styles.metadataCardTitle}>Mood</Text>
                {moods.length > 0 ? (
                  <View style={styles.moodRow}>
                    {moods.slice(0, 4).map((mood) => {
                      const emoji = mood.split(' ').pop();
                      return (
                        <Text key={mood} style={styles.moodRowEmoji}>{emoji}</Text>
                      );
                    })}
                    {moods.length > 4 && (
                      <Text style={styles.moreCount}>+{moods.length - 4}</Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.metadataCardPlaceholder}>How are you feeling?</Text>
                )}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
            </View>
          </TouchableOpacity>

          {/* Tagged Friends Section - Improved Card Design */}
          <TouchableOpacity
            style={styles.metadataCard}
            onPress={() => setShowFriendModal(true)}
            disabled={isRestricted}
          >
            <View style={styles.metadataCardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: '#dcfce7' }]}>
                <MaterialCommunityIcons name="account-multiple" size={20} color="#10b981" />
              </View>
              <View style={styles.metadataCardContent}>
                <Text style={styles.metadataCardTitle}>Who was with me</Text>
                {taggedFriends.length > 0 ? (
                  <View style={styles.friendsRow}>
                    {taggedFriends.slice(0, 3).map((friendId, index) => {
                      const friendship = friends.find(
                        (f) => f.friendId === friendId || f.userId === friendId
                      );
                      const friend = friendship?.friend || friendship?.user;
                      if (!friend) return null;
                      
                      // Get 2-letter initials
                      const username = friend.username || 'U';
                      const initials = username.length >= 2 ? username.substring(0, 2).toUpperCase() : username.charAt(0).toUpperCase();
                      
                      // Color rotation
                      const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
                      const bgColor = colors[index % colors.length];
                      
                      return (
                        <View key={friendId} style={[styles.friendAvatar, { backgroundColor: bgColor }]}>
                          <Text style={styles.friendAvatarText}>{initials}</Text>
                        </View>
                      );
                    })}
                    {taggedFriends.length > 3 && (
                      <View style={styles.friendAvatarMore}>
                        <Text style={styles.friendAvatarMoreText}>+{taggedFriends.length - 3}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={styles.metadataCardPlaceholder}>Tag friends in this memory</Text>
                )}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
            </View>
          </TouchableOpacity>

          {/* Privacy Section - Improved Card Design */}
          {!groupId && (
            <TouchableOpacity
              style={styles.metadataCard}
              onPress={() => setShowPrivacyDropdown(true)}
              disabled={isRestricted}
            >
              <View style={styles.metadataCardHeader}>
                <View style={[styles.iconBadge, { backgroundColor: '#fef2f2' }]}>
                  <MaterialCommunityIcons 
                    name={privacy === 'PRIVATE' ? 'lock' : privacy === 'ONLY_TAGGED' ? 'account-multiple' : privacy === 'FRIENDS' ? 'account-group' : 'earth'} 
                    size={20} 
                    color="#ef4444" 
                  />
                </View>
                <View style={styles.metadataCardContent}>
                  <Text style={styles.metadataCardTitle}>Who can see this</Text>
                  <Text style={styles.metadataCardValue}>
                    {privacy === 'PRIVATE' ? 'Private' : privacy === 'ONLY_TAGGED' ? 'Tagged Only' : privacy === 'FRIENDS' ? 'Friends' : 'Public'}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          )}

          {/* Core Memory Section - Improved Card Design */}
          <TouchableOpacity
            style={[styles.metadataCard, isCore && styles.metadataCardActive]}
            onPress={() => {
              if (isRestricted) return;
              if (!isCore) {
                setShowCoreReasonModal(true);
              } else {
                setIsCore(false);
                setCoreReason('');
              }
            }}
            disabled={isRestricted}
          >
            <View style={styles.metadataCardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: isCore ? '#fef3c7' : '#f9fafb' }]}>
                <MaterialCommunityIcons 
                  name={isCore ? 'star' : 'star-outline'} 
                  size={20} 
                  color={isCore ? '#f59e0b' : '#9ca3af'} 
                />
              </View>
              <View style={styles.metadataCardContent}>
                <Text style={[styles.metadataCardTitle, isCore && styles.metadataCardTitleActive]}>
                  Core Memory
                </Text>
                {coreReason && isCore ? (
                  <Text style={styles.metadataCardValue} numberOfLines={1}>{coreReason}</Text>
                ) : (
                  <Text style={styles.metadataCardPlaceholder}>Mark as special moment</Text>
                )}
              </View>
              <View style={[styles.checkbox, isCore && styles.checkboxActive]}>
                {isCore && <MaterialCommunityIcons name="check" size={16} color="#fff" />}
              </View>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => {
                  const newDate = new Date(calendarViewDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setCalendarViewDate(newDate);
                }}
              >
                <MaterialCommunityIcons name="chevron-left" size={28} color="#6366f1" />
              </TouchableOpacity>
              
              <Text style={styles.modalTitle}>
                {MONTHS[calendarViewDate.getMonth()]} {calendarViewDate.getFullYear()}
              </Text>
              
              <TouchableOpacity
                style={styles.calendarNavButton}
                onPress={() => {
                  const newDate = new Date(calendarViewDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setCalendarViewDate(newDate);
                }}
                disabled={calendarViewDate.getMonth() === new Date().getMonth() && 
                         calendarViewDate.getFullYear() === new Date().getFullYear()}
              >
                <MaterialCommunityIcons 
                  name="chevron-right" 
                  size={28} 
                  color={calendarViewDate.getMonth() === new Date().getMonth() && 
                         calendarViewDate.getFullYear() === new Date().getFullYear() ? '#d1d5db' : '#6366f1'} 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarContainer}>
              {/* Weekday headers */}
              <View style={styles.weekdayRow}>
                {WEEKDAYS.map((day) => (
                  <View key={day} style={styles.weekdayCell}>
                    <Text style={styles.weekdayText}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar days */}
              <View style={styles.calendarGrid}>
                {(() => {
                  const daysInMonth = getDaysInMonth(calendarViewDate);
                  const firstDay = getFirstDayOfMonth(calendarViewDate);
                  const days = [];
                  const today = new Date();

                  // Empty cells for days before month starts
                  for (let i = 0; i < firstDay; i++) {
                    days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
                  }

                  // Days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day);
                    const isSelected = isSameDay(date, memoryDate);
                    const isToday = isSameDay(date, today);
                    const isFuture = date > today;

                    days.push(
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayCell,
                          isSelected && styles.dayCellSelected,
                          isToday && !isSelected && styles.dayCellToday,
                        ]}
                        onPress={() => {
                          if (!isFuture) {
                            setMemoryDate(date);
                            setShowDatePicker(false);
                          }
                        }}
                        disabled={isFuture}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isSelected && styles.dayTextSelected,
                            isToday && !isSelected && styles.dayTextToday,
                            isFuture && styles.dayTextDisabled,
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  }

                  return days;
                })()}
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.calendarActions}>
              <TouchableOpacity
                style={styles.calendarTodayButton}
                onPress={() => {
                  setMemoryDate(new Date());
                  setCalendarViewDate(new Date());
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.calendarTodayButtonText}>Today</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.calendarCancelButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.calendarCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy Dropdown Modal */}
      <Modal
        visible={showPrivacyDropdown}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPrivacyDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Who can see this</Text>
              <TouchableOpacity onPress={() => setShowPrivacyDropdown(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.privacyOptionsContainer}>
              <TouchableOpacity
                style={styles.privacyOption}
                onPress={() => {
                  setPrivacy('PRIVATE');
                  setShowPrivacyDropdown(false);
                }}
              >
                <MaterialCommunityIcons name="lock" size={24} color={privacy === 'PRIVATE' ? '#6366f1' : '#6b7280'} />
                <View style={styles.privacyOptionContent}>
                  <Text style={[styles.privacyOptionTitle, privacy === 'PRIVATE' && styles.privacyOptionTitleActive]}>
                    Private
                  </Text>
                  <Text style={styles.privacyOptionDescription}>Only you</Text>
                </View>
                {privacy === 'PRIVATE' && <MaterialCommunityIcons name="check" size={24} color="#6366f1" />}
              </TouchableOpacity>

              <View style={styles.categoryItemSeparator} />

              <TouchableOpacity
                style={styles.privacyOption}
                onPress={() => {
                  setPrivacy('ONLY_TAGGED');
                  setShowPrivacyDropdown(false);
                }}
              >
                <MaterialCommunityIcons name="account-multiple" size={24} color={privacy === 'ONLY_TAGGED' ? '#6366f1' : '#6b7280'} />
                <View style={styles.privacyOptionContent}>
                  <Text style={[styles.privacyOptionTitle, privacy === 'ONLY_TAGGED' && styles.privacyOptionTitleActive]}>
                    Tagged Only
                  </Text>
                  <Text style={styles.privacyOptionDescription}>Only tagged friends</Text>
                </View>
                {privacy === 'ONLY_TAGGED' && <MaterialCommunityIcons name="check" size={24} color="#6366f1" />}
              </TouchableOpacity>

              <View style={styles.categoryItemSeparator} />

              <TouchableOpacity
                style={styles.privacyOption}
                onPress={() => {
                  setPrivacy('FRIENDS');
                  setShowPrivacyDropdown(false);
                }}
              >
                <MaterialCommunityIcons name="account-group" size={24} color={privacy === 'FRIENDS' ? '#6366f1' : '#6b7280'} />
                <View style={styles.privacyOptionContent}>
                  <Text style={[styles.privacyOptionTitle, privacy === 'FRIENDS' && styles.privacyOptionTitleActive]}>
                    Friends
                  </Text>
                  <Text style={styles.privacyOptionDescription}>All your friends</Text>
                </View>
                {privacy === 'FRIENDS' && <MaterialCommunityIcons name="check" size={24} color="#6366f1" />}
              </TouchableOpacity>

              <View style={styles.categoryItemSeparator} />

              <TouchableOpacity
                style={styles.privacyOption}
                onPress={() => {
                  setPrivacy('PUBLIC');
                  setShowPrivacyDropdown(false);
                }}
                disabled={user?.profileVisibility !== 'PUBLIC'}
              >
                <MaterialCommunityIcons name="earth" size={24} color={privacy === 'PUBLIC' ? '#6366f1' : '#9ca3af'} />
                <View style={styles.privacyOptionContent}>
                  <Text style={[styles.privacyOptionTitle, privacy === 'PUBLIC' && styles.privacyOptionTitleActive, user?.profileVisibility !== 'PUBLIC' && styles.privacyOptionTitleDisabled]}>
                    Public
                  </Text>
                  <Text style={styles.privacyOptionDescription}>
                    {user?.profileVisibility !== 'PUBLIC' ? 'Requires public profile' : 'Everyone'}
                  </Text>
                </View>
                {privacy === 'PUBLIC' && <MaterialCommunityIcons name="check" size={24} color="#6366f1" />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mood Modal */}
      <Modal
        visible={showMoodModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMoodModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How are you feeling?</Text>
              <TouchableOpacity onPress={() => setShowMoodModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.moodGrid}>
                {moodPresets.map((mood) => (
                  <TouchableOpacity
                    key={mood.label}
                    style={[
                      styles.moodItem,
                      moods.includes(`${mood.label} ${mood.emoji}`) && styles.moodItemActive,
                    ]}
                    onPress={() => toggleMood(`${mood.label} ${mood.emoji}`)}
                  >
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                    <Text style={styles.moodLabel}>{mood.label}</Text>
                    {moods.includes(`${mood.label} ${mood.emoji}`) && (
                      <View style={styles.moodCheck}>
                        <MaterialCommunityIcons name="check-circle" size={20} color="#6366f1" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={() => setShowMoodModal(false)}
            >
              <Text style={styles.modalDoneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Category Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Categories</Text>
              <TouchableOpacity onPress={() => setShowCreateCategoryModal(true)}>
                <MaterialCommunityIcons name="plus-circle" size={24} color="#6366f1" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.categoryItem}
                  onPress={() => toggleCategory(item.id)}
                >
                  <View style={styles.categoryItemLeft}>
                    <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
                    <Text style={styles.categoryItemText}>{item.name}</Text>
                  </View>
                  {selectedCategories.includes(item.id) && (
                    <MaterialCommunityIcons name="check" size={24} color="#6366f1" />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.categoryItemSeparator} />}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <Text style={styles.emptyModalText}>No categories yet. Create one!</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Create Category Modal */}
      <Modal
        visible={showCreateCategoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Category</Text>
              <TouchableOpacity onPress={() => setShowCreateCategoryModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Category Name */}
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="e.g., Work, Travel, Fitness"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholderTextColor="#9ca3af"
              />

              {/* Color Picker */}
              <Text style={styles.inputLabel}>Color</Text>
              <View style={styles.colorGrid}>
                {colorPresets.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      newCategoryColor === color && styles.colorOptionActive,
                    ]}
                    onPress={() => setNewCategoryColor(color)}
                  >
                    {newCategoryColor === color && (
                      <MaterialCommunityIcons name="check" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Icon Picker */}
              <Text style={styles.inputLabel}>Icon</Text>
              <View style={styles.iconGrid}>
                {iconPresets.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      newCategoryIcon === icon && styles.iconOptionActive,
                    ]}
                    onPress={() => setNewCategoryIcon(icon)}
                  >
                    <MaterialCommunityIcons
                      name={icon}
                      size={24}
                      color={newCategoryIcon === icon ? '#6366f1' : '#6b7280'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCreateButton}
              onPress={createNewCategory}
            >
              <Text style={styles.modalCreateButtonText}>Create Category</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Friend Modal */}
      <Modal
        visible={showFriendModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowFriendModal(false);
          setFriendSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tag Friends</Text>
              <TouchableOpacity onPress={() => {
                setShowFriendModal(false);
                setFriendSearchQuery('');
              }}>
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search friends..."
                value={friendSearchQuery}
                onChangeText={setFriendSearchQuery}
                autoCapitalize="none"
              />
              {friendSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setFriendSearchQuery('')}>
                  <MaterialCommunityIcons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={friends.filter((item) => {
                // Determine which user is the friend (not the current user)
                const friend = item.userId === user?.id ? item.friend : item.user;
                if (!friend) return false;
                if (!friendSearchQuery.trim()) return true;
                const query = friendSearchQuery.toLowerCase();
                return (
                  friend.username?.toLowerCase().includes(query) ||
                  friend.displayName?.toLowerCase().includes(query) ||
                  friend.email?.toLowerCase().includes(query)
                );
              })}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                // Determine which user is the friend (not the current user)
                const friend = item.userId === user?.id ? item.friend : item.user;
                if (!friend) return null;
                const friendId = item.userId === user?.id ? item.friendId : item.userId;
                return (
                  <TouchableOpacity
                    style={styles.categoryItem}
                    onPress={() => toggleFriend(friendId)}
                  >
                    <View style={styles.categoryItemLeft}>
                      <Text style={styles.categoryItemText}>{friend.username}</Text>
                      {friend.displayName && (
                        <Text style={styles.friendSubtext}>{friend.displayName}</Text>
                      )}
                    </View>
                    {taggedFriends.includes(friendId) && (
                      <MaterialCommunityIcons name="check" size={24} color="#6366f1" />
                    )}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.categoryItemSeparator} />}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <Text style={styles.emptyModalText}>
                  {friendSearchQuery.trim() ? 'No friends found' : 'No friends to tag'}
                </Text>
              }
            />
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
              value={coreReason}
              onChangeText={setCoreReason}
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            <View style={styles.coreReasonModalActions}>
              <TouchableOpacity
                style={styles.coreReasonModalButtonOutline}
                onPress={() => {
                  setIsCore(true);
                  setShowCoreReasonModal(false);
                }}
              >
                <Text style={styles.coreReasonModalButtonTextOutline}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.coreReasonModalButton}
                onPress={() => {
                  setIsCore(true);
                  setShowCoreReasonModal(false);
                }}
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  submitButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  restrictedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  restrictedText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  // Two-step wizard specific styles
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 6,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d1d5db',
  },
  stepDotActive: {
    backgroundColor: '#6366f1',
    width: 20,
  },
  nextButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  nextButtonTextDisabled: {
    color: '#d1d5db',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  // Calendar styles
  calendarNavButton: {
    padding: 4,
  },
  calendarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekdayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  dayCellSelected: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 12,
  },
  dayText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dayTextToday: {
    color: '#6366f1',
    fontWeight: '700',
  },
  dayTextDisabled: {
    color: '#d1d5db',
  },
  calendarActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  calendarTodayButton: {
    flex: 1,
    backgroundColor: '#eef2ff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  calendarTodayButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  calendarCancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  calendarCancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  // Category and Friend list items in modals
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  categoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryItemText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  searchBar: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    marginHorizontal: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    padding: 0,
  },
  emptyModalText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 24,
  },
  categoryItemSeparator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 20,
  },
  // Create category modal styles
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionActive: {
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  iconOptionActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  modalCreateButton: {
    backgroundColor: '#6366f1',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCreateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Diary page (Step 1)
  diaryContentContainer: {
    padding: 24,
    paddingTop: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  diaryInput: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    minHeight: 300,
    textAlignVertical: 'top',
    padding: 0,
  },
  diaryHint: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
    flex: 1,
  },
  // Metadata page (Step 2)
  metadataContentContainer: {
    padding: 16,
    gap: 20,
  },
  section: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  // Photo carousel
  photoCarouselContainer: {
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    aspectRatio: 4 / 3,
    position: 'relative',
  },
  photoCarousel: {
    width: '100%',
    height: '100%',
  },
  photoControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 12,
  },
  removePhotoButton: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
  },
  photoNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'center',
  },
  photoCounter: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  photoDots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  photoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  photoDotActive: {
    backgroundColor: '#fff',
    width: 18,
  },
  emptyPhotoContainer: {
    aspectRatio: 4 / 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    gap: 8,
  },
  emptyPhotoText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 12,
  },
  photoActionText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  photoActionTextDisabled: {
    color: '#d1d5db',
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  uploadingText: {
    fontSize: 14,
    color: '#6366f1',
  },
  // Chips
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  selectedChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 10,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  // Privacy dropdown (compact version)
  privacyDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
  },
  privacyDropdownText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  // Privacy modal options container
  privacyOptionsContainer: {
    paddingBottom: 20,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#fff',
  },
  privacyOptionContent: {
    flex: 1,
  },
  privacyOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  privacyOptionTitleActive: {
    color: '#6366f1',
  },
  privacyOptionTitleDisabled: {
    color: '#9ca3af',
  },
  privacyOptionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  // Mood modal
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 8,
    gap: 12,
  },
  moodItem: {
    width: (SCREEN_WIDTH - 72) / 3,
    aspectRatio: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    position: 'relative',
  },
  moodItemActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  moodEmoji: {
    fontSize: 32,
  },
  moodLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  moodCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  modalDoneButton: {
    backgroundColor: '#6366f1',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalDoneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Create category
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  modalTextInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    marginHorizontal: 20,
    marginTop: 16,
  },
  friendSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 4,
  },
  // Core Memory Toggle
  coreMemoryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  coreMemoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  coreMemoryTextContainer: {
    flex: 1,
  },
  coreMemoryTitle: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  coreMemoryTitleActive: {
    color: '#1f2937',
    fontWeight: '600',
  },
  coreMemoryReason: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
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
  // New improved styles
  dateBadge: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 6,
  },
  titleContainer: {
    marginBottom: 20,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    padding: 0,
    marginBottom: 8,
  },
  titleUnderline: {
    height: 2,
    backgroundColor: '#e5e7eb',
    borderRadius: 1,
  },
  richTextToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  toolbarButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarButtonActive: {
    backgroundColor: '#eef2ff',
  },
  toolbarDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e5e7eb',
  },
  // Rich text preview styles
  richTextPreview: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  richTextPreviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  richTextPreviewContent: {
    minHeight: 40,
  },
  richTextNormal: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },
  richTextBold: {
    fontSize: 16,
    lineHeight: 24,
    color: '#111827',
    fontWeight: '700',
  },
  richTextItalic: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    fontStyle: 'italic',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 16,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: '#065f46',
    fontWeight: '500',
  },
  diaryHintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  // Rich Editor styles
  richToolbar: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  richToolbarSelected: {
    backgroundColor: '#eef2ff',
    borderRadius: 8,
  },
  richEditor: {
    flex: 1,
    minHeight: 300,
    backgroundColor: '#fff',
  },
  diaryActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  diaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  diaryActionText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  recordingContainer: {
    flex: 1,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  recordingText: {
    fontSize: 13,
    color: '#991b1b',
    fontWeight: '600',
  },
  recordingButtons: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  recordingCancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  recordingStopBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioPlayerContainer: {
    flex: 1,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
  },
  audioPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioInfo: {
    flex: 1,
  },
  audioLabel: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '600',
  },
  audioDuration: {
    fontSize: 11,
    color: '#60a5fa',
    marginTop: 2,
  },
  audioDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  // Improved metadata cards
  metadataCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  metadataCardActive: {
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  metadataCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metadataCardContent: {
    flex: 1,
  },
  metadataCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  metadataCardTitleActive: {
    color: '#f59e0b',
  },
  metadataCardPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
  },
  metadataCardValue: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  miniChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  moreCount: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginLeft: 4,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moodRowEmoji: {
    fontSize: 20,
  },
  friendsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: -8,
  },
  friendAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  friendAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  friendAvatarMore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  friendAvatarMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
});

