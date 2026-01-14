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
import { StripePrice } from '../../types';

type RootStackParamList = {
  PricingScreen: undefined;
  SubscriptionManagement: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'PricingScreen'>;

interface PricingTier {
  name: string;
  price: string;
  interval: string;
  storage: string;
  features: string[];
  priceId: string;
  isPopular?: boolean;
  color: string;
  hasMonthly?: boolean;
}

export default function PricingScreen({ navigation }: Props) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processingPriceId, setProcessingPriceId] = useState<string | null>(null);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);

  useEffect(() => {
    loadPrices();
  }, []);

  const loadPrices = async () => {
    try {
      const response = await api.get<StripePrice[]>('/api/stripe/prices');
      
      // Group prices by product and create pricing tiers
      const tiers: PricingTier[] = response.map((price) => {
        const isMonthly = price.recurring?.interval === 'month';
        const amount = price.unit_amount / 100; // Convert cents to dollars
        
        return {
          name: price.product.name,
          price: `$${amount}`,
          interval: isMonthly ? '/month' : '/year',
          priceId: price.id,
          isPopular: price.product.metadata?.popular === 'true',
          color: isMonthly ? '#6366f1' : '#f59e0b',
          features: [
            '✨ Unlimited memories',
            '👥 Create & join groups',
            '📁 Unlimited collections',
            '🎨 All premium themes',
            '💾 Unlimited storage',
            '🚀 Priority support',
            '🔒 Advanced privacy controls',
          ],
        };
      });

      setPricingTiers(tiers);
    } catch (error) {
      console.error('Error loading prices:', error);
      Alert.alert('Error', 'Failed to load pricing information');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (priceId: string) => {
    try {
      setProcessingPriceId(priceId);

      const response = await api.post<{ url: string; sessionId: string }>(
        '/api/stripe/checkout',
        { priceId }
      );

      if (response.url) {
        // Open Stripe checkout in browser
        const supported = await Linking.canOpenURL(response.url);
        if (supported) {
          await Linking.openURL(response.url);
        } else {
          Alert.alert('Error', 'Unable to open checkout page');
        }
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to start checkout process'
      );
    } finally {
      setProcessingPriceId(null);
    }
  };

  const renderFeatureComparison = () => (
    <View style={styles.comparisonContainer}>
      <Text style={styles.comparisonTitle}>Free vs Premium</Text>
      
      <View style={styles.comparisonTable}>
        <View style={styles.comparisonRow}>
          <Text style={styles.comparisonFeature}>Memories per month</Text>
          <Text style={styles.comparisonFree}>10</Text>
          <Text style={styles.comparisonPremium}>Unlimited</Text>
        </View>
        
        <View style={styles.comparisonRow}>
          <Text style={styles.comparisonFeature}>Groups</Text>
          <MaterialCommunityIcons name="close" size={20} color="#ef4444" />
          <MaterialCommunityIcons name="check" size={20} color="#10b981" />
        </View>
        
        <View style={styles.comparisonRow}>
          <Text style={styles.comparisonFeature}>Collections</Text>
          <Text style={styles.comparisonFree}>3</Text>
          <Text style={styles.comparisonPremium}>Unlimited</Text>
        </View>
        
        <View style={styles.comparisonRow}>
          <Text style={styles.comparisonFeature}>Storage</Text>
          <Text style={styles.comparisonFree}>1GB</Text>
          <Text style={styles.comparisonPremium}>Unlimited</Text>
        </View>
        
        <View style={styles.comparisonRow}>
          <Text style={styles.comparisonFeature}>Priority Support</Text>
          <MaterialCommunityIcons name="close" size={20} color="#ef4444" />
          <MaterialCommunityIcons name="check" size={20} color="#10b981" />
        </View>
      </View>
    </View>
  );

  const renderPricingTier = (tier: PricingTier) => {
    const isProcessing = processingPriceId === tier.priceId;

    return (
      <View
        key={tier.priceId}
        style={[
          styles.tierCard,
          tier.isPopular && styles.tierCardPopular,
        ]}
      >
        {tier.isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
          </View>
        )}

        <View style={styles.tierHeader}>
          <Text style={styles.tierName}>{tier.name}</Text>
          <View style={styles.tierPriceContainer}>
            <Text style={[styles.tierPrice, { color: tier.color }]}>
              {tier.price}
            </Text>
            <Text style={styles.tierInterval}>{tier.interval}</Text>
          </View>
        </View>

        <View style={styles.tierFeatures}>
          {tier.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color={tier.color}
              />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.subscribeButton,
            { backgroundColor: tier.color },
            isProcessing && styles.subscribeButtonDisabled,
          ]}
          onPress={() => handleSubscribe(tier.priceId)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading pricing...</Text>
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
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Plan Status */}
        {user?.mode === 'FULL' && (
          <View style={styles.currentPlanCard}>
            <MaterialCommunityIcons name="crown" size={32} color="#f59e0b" />
            <View style={styles.currentPlanContent}>
              <Text style={styles.currentPlanTitle}>Premium Active</Text>
              <Text style={styles.currentPlanSubtitle}>
                You're enjoying all premium features
              </Text>
            </View>
            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => navigation.navigate('SubscriptionManagement')}
            >
              <Text style={styles.manageButtonText}>Manage</Text>
            </TouchableOpacity>
          </View>
        )}

        {user?.mode === 'RESTRICTED' && (
          <View style={styles.heroSection}>
            <MaterialCommunityIcons name="rocket-launch" size={64} color="#6366f1" />
            <Text style={styles.heroTitle}>Unlock Premium</Text>
            <Text style={styles.heroSubtitle}>
              Get unlimited access to all features and make the most of your memories
            </Text>
          </View>
        )}

        {/* Pricing Tiers */}
        <View style={styles.tiersContainer}>
          {pricingTiers.map(renderPricingTier)}
        </View>

        {/* Feature Comparison */}
        {renderFeatureComparison()}

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqItem}>
            <MaterialCommunityIcons name="help-circle" size={24} color="#6366f1" />
            <View style={styles.faqContent}>
              <Text style={styles.faqQuestion}>Can I cancel anytime?</Text>
              <Text style={styles.faqAnswer}>
                Yes! You can cancel your subscription at any time. You'll continue to have
                access until the end of your billing period.
              </Text>
            </View>
          </View>

          <View style={styles.faqItem}>
            <MaterialCommunityIcons name="help-circle" size={24} color="#6366f1" />
            <View style={styles.faqContent}>
              <Text style={styles.faqQuestion}>What payment methods do you accept?</Text>
              <Text style={styles.faqAnswer}>
                We accept all major credit cards (Visa, Mastercard, American Express) through
                our secure payment processor Stripe.
              </Text>
            </View>
          </View>

          <View style={styles.faqItem}>
            <MaterialCommunityIcons name="help-circle" size={24} color="#6366f1" />
            <View style={styles.faqContent}>
              <Text style={styles.faqQuestion}>Is there a free trial?</Text>
              <Text style={styles.faqAnswer}>
                Yes! New subscribers get a 7-day free trial to experience all premium features
                before being charged.
              </Text>
            </View>
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
  currentPlanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  currentPlanContent: {
    flex: 1,
    marginLeft: 12,
  },
  currentPlanTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  currentPlanSubtitle: {
    fontSize: 14,
    color: '#b45309',
  },
  manageButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  manageButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 320,
  },
  tiersContainer: {
    gap: 16,
    marginBottom: 32,
  },
  tierCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  tierCardPopular: {
    borderColor: '#6366f1',
    transform: [{ scale: 1.02 }],
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tierHeader: {
    marginBottom: 24,
  },
  tierName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  tierPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  tierPrice: {
    fontSize: 48,
    fontWeight: '700',
  },
  tierInterval: {
    fontSize: 18,
    color: '#6b7280',
    marginLeft: 4,
  },
  tierFeatures: {
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  comparisonContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
  },
  comparisonTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  comparisonTable: {
    gap: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  comparisonFeature: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  comparisonFree: {
    fontSize: 16,
    color: '#6b7280',
    width: 80,
    textAlign: 'center',
  },
  comparisonPremium: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
    width: 80,
    textAlign: 'center',
  },
  faqSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
  },
  faqTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 24,
  },
  faqItem: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  faqContent: {
    flex: 1,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});
