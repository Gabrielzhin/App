import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { Subscription } from '../../types';

type RootStackParamList = {
  SubscriptionManagement: undefined;
  PricingScreen: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'SubscriptionManagement'>;

export default function SubscriptionManagementScreen({ navigation }: Props) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      // In a real app, you'd have a GET endpoint for subscription details
      // For now, we'll trigger a sync which returns the subscription
      await syncSubscription();
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncSubscription = async () => {
    try {
      setSyncing(true);
      const response = await api.post<{
        success: boolean;
        status: string;
        mode: string;
        subscription: any;
      }>('/api/stripe/sync-subscription');
      
      if (response.success) {
        await refreshUser();
        Alert.alert('Success', 'Subscription synced successfully');
      }
    } catch (error: any) {
      console.error('Error syncing subscription:', error);
      Alert.alert(
        'Sync Failed',
        error.response?.data?.error || 'Failed to sync subscription'
      );
    } finally {
      setSyncing(false);
    }
  };

  const openBillingPortal = async () => {
    try {
      const response = await api.get<{ url: string }>('/api/stripe/portal');
      
      if (response.url) {
        const supported = await Linking.canOpenURL(response.url);
        if (supported) {
          await Linking.openURL(response.url);
        } else {
          Alert.alert('Error', 'Unable to open billing portal');
        }
      }
    } catch (error: any) {
      console.error('Error opening billing portal:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to open billing portal'
      );
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'TRIALING':
        return '#10b981';
      case 'PAST_DUE':
        return '#f59e0b';
      case 'CANCELED':
      case 'UNPAID':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'TRIALING':
        return 'Trial';
      case 'PAST_DUE':
        return 'Past Due';
      case 'CANCELED':
        return 'Canceled';
      case 'UNPAID':
        return 'Unpaid';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading subscription...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (user?.mode === 'RESTRICTED') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="crown-outline" size={80} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Active Subscription</Text>
          <Text style={styles.emptySubtitle}>
            Upgrade to Premium to unlock unlimited features
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => navigation.navigate('PricingScreen')}
          >
            <Text style={styles.upgradeButtonText}>View Plans</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <TouchableOpacity
          style={styles.syncButton}
          onPress={syncSubscription}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <MaterialCommunityIcons name="refresh" size={24} color="#6366f1" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <MaterialCommunityIcons name="crown" size={32} color="#f59e0b" />
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>Premium Plan</Text>
              <View style={styles.statusBadge}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(subscription?.status) },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(subscription?.status) },
                  ]}
                >
                  {getStatusText(subscription?.status)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Subscription Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Subscription Details</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <MaterialCommunityIcons
                name="calendar-clock"
                size={20}
                color="#6b7280"
              />
              <Text style={styles.detailLabelText}>Current Period</Text>
            </View>
            <Text style={styles.detailValue}>
              {formatDate(subscription?.currentPeriodStart)} -{' '}
              {formatDate(subscription?.currentPeriodEnd)}
            </Text>
          </View>

          {subscription?.trialEnd && (
            <View style={styles.detailRow}>
              <View style={styles.detailLabel}>
                <MaterialCommunityIcons
                  name="gift-outline"
                  size={20}
                  color="#6b7280"
                />
                <Text style={styles.detailLabelText}>Trial Ends</Text>
              </View>
              <Text style={styles.detailValue}>
                {formatDate(subscription.trialEnd)}
              </Text>
            </View>
          )}

          {subscription?.cancelAtPeriodEnd && (
            <View style={[styles.detailRow, styles.warningRow]}>
              <View style={styles.detailLabel}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={20}
                  color="#f59e0b"
                />
                <Text style={[styles.detailLabelText, styles.warningText]}>
                  Cancels On
                </Text>
              </View>
              <Text style={[styles.detailValue, styles.warningText]}>
                {formatDate(subscription.currentPeriodEnd)}
              </Text>
            </View>
          )}
        </View>

        {/* Features Card */}
        <View style={styles.featuresCard}>
          <Text style={styles.sectionTitle}>Your Premium Features</Text>
          
          <View style={styles.featuresList}>
            {[
              { icon: 'infinity', text: 'Unlimited memories' },
              { icon: 'account-group', text: 'Create & join unlimited groups' },
              { icon: 'folder-multiple', text: 'Unlimited collections' },
              { icon: 'palette', text: 'All premium themes' },
              { icon: 'cloud-upload', text: 'Unlimited cloud storage' },
              { icon: 'lightning-bolt', text: 'Priority support' },
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <MaterialCommunityIcons
                  name={feature.icon as any}
                  size={24}
                  color="#6366f1"
                />
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={openBillingPortal}
          >
            <MaterialCommunityIcons name="credit-card" size={24} color="#6366f1" />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Manage Billing</Text>
              <Text style={styles.actionSubtitle}>
                Update payment method, view invoices
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={openBillingPortal}
          >
            <MaterialCommunityIcons name="swap-horizontal" size={24} color="#6366f1" />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Change Plan</Text>
              <Text style={styles.actionSubtitle}>
                Upgrade or downgrade your subscription
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={openBillingPortal}
          >
            <MaterialCommunityIcons name="close-circle" size={24} color="#ef4444" />
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, styles.dangerText]}>
                Cancel Subscription
              </Text>
              <Text style={styles.actionSubtitle}>
                Cancel at any time, no questions asked
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Help Section */}
        <View style={styles.helpCard}>
          <MaterialCommunityIcons name="help-circle" size={24} color="#6366f1" />
          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <Text style={styles.helpText}>
              If you have any questions about your subscription or billing, please
              contact our support team.
            </Text>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  syncButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  detailLabelText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 28,
  },
  warningRow: {
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  warningText: {
    color: '#f59e0b',
  },
  featuresCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
  },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  dangerButton: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  dangerText: {
    color: '#ef4444',
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 32,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
});
