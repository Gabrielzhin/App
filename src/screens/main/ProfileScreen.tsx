import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const MenuSection = ({ title, children }: any) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  const MenuItem = ({ icon, title, subtitle, onPress, badge }: any) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <View style={styles.menuIcon}>
          <MaterialCommunityIcons name={icon} size={24} color="#6366f1" />
        </View>
        <View>
          <Text style={styles.menuItemTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.menuItemRight}>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => navigation.navigate('EditProfile')}
          >
            {user?.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <MaterialCommunityIcons name="account" size={48} color="#6366f1" />
              </View>
            )}
            <View style={styles.editAvatarButton}>
              <MaterialCommunityIcons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.displayName}>
            {user?.displayName || user?.username || 'User'}
          </Text>
          {user?.bio && (
            <Text style={styles.bio}>{user.bio}</Text>
          )}
          <Text style={styles.email}>{user?.email}</Text>
          {user?.mode === 'RESTRICTED' && (
            <View style={styles.modeBadge}>
              <MaterialCommunityIcons name="lock" size={14} color="#92400e" />
              <Text style={styles.modeBadgeText}>Free Plan</Text>
            </View>
          )}
          {user?.mode === 'FULL' && (
            <View style={[styles.modeBadge, styles.modeBadgeFull]}>
              <MaterialCommunityIcons name="crown" size={14} color="#065f46" />
              <Text style={[styles.modeBadgeText, styles.modeBadgeTextFull]}>
                Premium
              </Text>
            </View>
          )}
        </View>

        {user?.mode === 'RESTRICTED' && (
          <TouchableOpacity 
            style={styles.upgradeCard}
            onPress={() => navigation.navigate('PricingScreen')}
          >
            <View style={styles.upgradeCardIcon}>
              <MaterialCommunityIcons name="rocket-launch" size={32} color="#f59e0b" />
            </View>
            <View style={styles.upgradeCardContent}>
              <Text style={styles.upgradeCardTitle}>Upgrade to Premium</Text>
              <Text style={styles.upgradeCardSubtitle}>
                Unlock unlimited memories, groups, and more
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#f59e0b" />
          </TouchableOpacity>
        )}

        {user?.mode === 'FULL' && (
          <TouchableOpacity 
            style={styles.premiumCard}
            onPress={() => navigation.navigate('SubscriptionManagement')}
          >
            <View style={styles.premiumCardIcon}>
              <MaterialCommunityIcons name="crown" size={32} color="#f59e0b" />
            </View>
            <View style={styles.premiumCardContent}>
              <Text style={styles.premiumCardTitle}>Premium Active</Text>
              <Text style={styles.premiumCardSubtitle}>
                Manage your subscription
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#065f46" />
          </TouchableOpacity>
        )}

        <MenuSection title="Account">
          <MenuItem
            icon="account-edit"
            title="Edit Profile"
            subtitle="Update your personal information"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <MenuItem
            icon="lock-reset"
            title="Change Password"
            onPress={() => {}}
          />
          <MenuItem
            icon="email-check"
            title="Email Verification"
            subtitle={user?.emailVerified ? 'Verified' : 'Not verified'}
            badge={user?.emailVerified ? '✓' : '!'}
            onPress={() => {}}
          />
        </MenuSection>

        <MenuSection title="Preferences">
          <MenuItem
            icon="account-multiple"
            title="Friends"
            subtitle="Manage your connections"
            onPress={() => navigation.navigate('Friends')}
          />
          <MenuItem
            icon="head-question"
            title="My Quiz"
            subtitle="Let your friends guess how well they know you"
            onPress={() => navigation.navigate('MyQuiz')}
          />
          <MenuItem
            icon="tag-multiple"
            title="Manage Relationships"
            subtitle="Organize how you know your friends"
            onPress={() => navigation.navigate('RelationshipManager')}
          />
          <MenuItem
            icon="shield-check"
            title="Privacy & Safety"
            subtitle="Control who can see your content"
            onPress={() => navigation.navigate('PrivacySettings')}
          />
          <MenuItem
            icon="palette"
            title="Theme"
            subtitle="Light"
            onPress={() => {}}
          />
          <MenuItem
            icon="bell"
            title="Notifications"
            onPress={() => navigation.navigate('Notifications')}
          />
          <MenuItem
            icon="albums"
            title="Collections"
            subtitle="Organize your memories"
            onPress={() => navigation.navigate('Collections')}
          />
        </MenuSection>

        <MenuSection title="Referrals">
          <MenuItem
            icon="gift"
            title="Invite Friends"
            subtitle={`Your code: ${user?.referralCode}`}
            onPress={() => {}}
          />
          <MenuItem
            icon="cash"
            title="Payout Methods"
            onPress={() => {}}
          />
        </MenuSection>

        <MenuSection title="Support">
          <MenuItem
            icon="help-circle"
            title="Help Center"
            onPress={() => {}}
          />
          <MenuItem
            icon="information"
            title="About"
            onPress={() => {}}
          />
        </MenuSection>

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={20} color="#ef4444" />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 32,
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  modeBadgeFull: {
    backgroundColor: '#d1fae5',
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  modeBadgeTextFull: {
    color: '#065f46',
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fef3c7',
  },
  upgradeCardIcon: {
    marginRight: 12,
  },
  upgradeCardContent: {
    flex: 1,
  },
  upgradeCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  upgradeCardSubtitle: {
    fontSize: 12,
    color: '#b45309',
  },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#a7f3d0',
  },
  premiumCardIcon: {
    marginRight: 12,
  },
  premiumCardContent: {
    flex: 1,
  },
  premiumCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 4,
  },
  premiumCardSubtitle: {
    fontSize: 12,
    color: '#047857',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 16,
    marginBottom: 12,
  },
  sectionContent: {
    backgroundColor: '#fff',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    lineHeight: 20,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
