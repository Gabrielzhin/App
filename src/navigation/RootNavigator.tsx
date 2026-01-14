import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Import screens (we'll create these next)
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import TimelineScreen from '../screens/main/TimelineScreen';
import OrbitHomeScreen from '../screens/main/OrbitHomeScreen';
import FriendsActivityScreen from '../screens/main/FriendsActivityScreen';
import CreateMemoryScreen from '../screens/main/CreateMemoryScreen';
import GroupsScreen from '../screens/main/GroupsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import MemoryDetailScreen from '../screens/main/MemoryDetailScreen';
import PhotosScreen from '../screens/main/PhotosScreen';
import GroupDetailScreen from '../screens/main/GroupDetailScreen';
import GroupChatScreen from '../screens/main/GroupChatScreen';
import CreateGroupScreen from '../screens/main/CreateGroupScreen';
import GroupSettingsScreen from '../screens/main/GroupSettingsScreen';
import GroupMembersScreen from '../screens/main/GroupMembersScreen';
import FriendsScreen from '../screens/main/FriendsScreen';
import DirectMessageScreen from '../screens/main/DirectMessageScreen';
import FriendProfileScreen from '../screens/main/FriendProfileScreen';
import RelationshipManagerScreen from '../screens/main/RelationshipManagerScreen';
import EditProfileScreen from '../screens/main/EditProfileScreen';
import PrivacySettingsScreen from '../screens/main/PrivacySettingsScreen';
import SearchScreen from '../screens/main/SearchScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import CollectionsScreen from '../screens/main/CollectionsScreen';
import CollectionDetailScreen from '../screens/main/CollectionDetailScreen';
import PricingScreen from '../screens/main/PricingScreen';
import SubscriptionManagementScreen from '../screens/main/SubscriptionManagementScreen';
import FriendsListScreen from '../screens/main/FriendsListScreen';
import MyQuizScreen from '../screens/main/MyQuizScreen';
import TakeFriendQuizScreen from '../screens/main/TakeFriendQuizScreen';
import QuizResultsScreen from '../screens/main/QuizResultsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const MainStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const GroupsStack = createNativeStackNavigator();
const PhotosStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

// Export types for navigation
export type MainStackParamList = {
  MainTabs: undefined;
  Friends: undefined;
  MemoryDetail: { id: string };
  GroupDetail: { groupId: string };
  GroupChat: { groupId: string };
  CreateGroup: undefined;
  GroupSettings: { groupId: string };
  GroupMembers: { groupId: string };
  DirectMessage: { userId: string };
  FriendProfile: { userId: string };
  RelationshipManager: undefined;
  EditProfile: undefined;
  PrivacySettings: undefined;
  Notifications: undefined;
  Collections: undefined;
  CollectionDetail: { collectionId: string };
  CreateMemory: undefined;
};

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Nested Stack for Home Tab
function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={OrbitHomeScreen} />
      <HomeStack.Screen name="FriendsActivity" component={FriendsActivityScreen} />
      <HomeStack.Screen name="MemoryDetail" component={MemoryDetailScreen} />
      <HomeStack.Screen name="FriendProfile" component={FriendProfileScreen} />
      <HomeStack.Screen name="DirectMessage" component={DirectMessageScreen} />
      <HomeStack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
      <HomeStack.Screen name="Notifications" component={NotificationsScreen} />
      <HomeStack.Screen name="TakeFriendQuiz" component={TakeFriendQuizScreen} />
    </HomeStack.Navigator>
  );
}

// Nested Stack for Groups Tab
function GroupsStackScreen() {
  return (
    <GroupsStack.Navigator screenOptions={{ headerShown: false }}>
      <GroupsStack.Screen name="GroupsList" component={GroupsScreen} />
      <GroupsStack.Screen name="FriendsList" component={FriendsListScreen} />
      <GroupsStack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <GroupsStack.Screen name="GroupChat" component={GroupChatScreen} />
      <GroupsStack.Screen name="GroupSettings" component={GroupSettingsScreen} />
      <GroupsStack.Screen name="GroupMembers" component={GroupMembersScreen} />
      <GroupsStack.Screen name="MemoryDetail" component={MemoryDetailScreen} />
      <GroupsStack.Screen name="FriendProfile" component={FriendProfileScreen} />
      <GroupsStack.Screen name="TakeFriendQuiz" component={TakeFriendQuizScreen} />
    </GroupsStack.Navigator>
  );
}

// Nested Stack for Photos Tab
function PhotosStackScreen() {
  return (
    <PhotosStack.Navigator screenOptions={{ headerShown: false }}>
      <PhotosStack.Screen name="PhotosList" component={PhotosScreen} />
      <PhotosStack.Screen name="MemoryDetail" component={MemoryDetailScreen} />
    </PhotosStack.Navigator>
  );
}

// Nested Stack for Profile Tab
function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="Friends" component={FriendsScreen} />
      <ProfileStack.Screen name="RelationshipManager" component={RelationshipManagerScreen} />
      <ProfileStack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
      <ProfileStack.Screen name="Notifications" component={NotificationsScreen} />
      <ProfileStack.Screen name="Collections" component={CollectionsScreen} />
      <ProfileStack.Screen name="MemoryDetail" component={MemoryDetailScreen} />
      <ProfileStack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="FriendProfile" component={FriendProfileScreen} />
      <ProfileStack.Screen name="PricingScreen" component={PricingScreen} />
      <ProfileStack.Screen name="SubscriptionManagement" component={SubscriptionManagementScreen} />
      <ProfileStack.Screen name="MyQuiz" component={MyQuizScreen} />
      <ProfileStack.Screen name="QuizResults" component={QuizResultsScreen} />
      <ProfileStack.Screen name="TakeFriendQuiz" component={TakeFriendQuizScreen} />
    </ProfileStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'GroupsTab') {
            iconName = focused ? 'account-group' : 'account-group-outline';
          } else if (route.name === 'Create') {
            iconName = 'plus-circle';
          } else if (route.name === 'PhotosTab') {
            iconName = focused ? 'image-multiple' : 'image-multiple-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'account' : 'account-outline';
          } else {
            iconName = 'circle';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeStackScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="GroupsTab" 
        component={GroupsStackScreen}
        options={{ title: 'Social' }}
      />
      <Tab.Screen 
        name="Create" 
        component={CreateMemoryScreen}
        options={{
          tabBarLabel: 'Create',
        }}
      />
      <Tab.Screen 
        name="PhotosTab" 
        component={PhotosStackScreen}
        options={{ title: 'Photos' }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileStackScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

function MainStackScreen() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <MainStack.Screen name="MainTabs" component={MainTabs} />
      <MainStack.Screen name="SearchScreen" component={SearchScreen} />
      <MainStack.Screen 
        name="CreateMemory" 
        component={CreateMemoryScreen}
        options={{ presentation: 'modal' }}
      />
      <MainStack.Screen 
        name="CreateGroup" 
        component={CreateGroupScreen}
        options={{ presentation: 'modal' }}
      />
      <MainStack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{ presentation: 'modal' }}
      />
    </MainStack.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    // You can return a loading screen here
    return null;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStackScreen /> : <AuthStack />}
    </NavigationContainer>
  );
}
