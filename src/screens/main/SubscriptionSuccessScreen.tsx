import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

type RootStackParamList = {
  SubscriptionSuccess: { session_id?: string };
  ProfileMain: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'SubscriptionSuccess'>;

export default function SubscriptionSuccessScreen({ navigation, route }: Props) {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refetchUser } = useAuth();

  useEffect(() => {
    verifySubscription();
  }, []);

  const verifySubscription = async () => {
    try {
      setLoading(true);
      
      // Give webhooks a moment to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refetch user to get updated subscription status
      await refetchUser();
      
      setSuccess(true);
    } catch (err: any) {
      console.error('Error verifying subscription:', err);
      setError(err.message || 'Failed to verify subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'ProfileMain' }],
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Activating your subscription...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <MaterialCommunityIcons name="alert-circle" size={80} color="#ef4444" />
        <Text style={styles.title}>Something Went Wrong</Text>
        <Text style={styles.message}>{error}</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#8b5cf6' }]}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.successIcon}>
        <MaterialCommunityIcons name="check-circle" size={80} color="#10b981" />
      </View>
      
      <Text style={styles.title}>Welcome to Premium! 🎉</Text>
      
      <Text style={styles.message}>
        Your subscription has been activated successfully. You now have access to all premium features!
      </Text>

      <View style={styles.featuresContainer}>
        <View style={styles.featureRow}>
          <MaterialCommunityIcons name="check-circle" size={24} color="#10b981" />
          <Text style={styles.featureText}>Unlimited memories</Text>
        </View>
        <View style={styles.featureRow}>
          <MaterialCommunityIcons name="check-circle" size={24} color="#10b981" />
          <Text style={styles.featureText}>Unlimited groups</Text>
        </View>
        <View style={styles.featureRow}>
          <MaterialCommunityIcons name="check-circle" size={24} color="#10b981" />
          <Text style={styles.featureText}>Unlimited collections</Text>
        </View>
        <View style={styles.featureRow}>
          <MaterialCommunityIcons name="check-circle" size={24} color="#10b981" />
          <Text style={styles.featureText}>Unlimited storage</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleContinue}
      >
        <Text style={styles.buttonText}>Start Exploring</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  successIcon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f9fafb',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#f9fafb',
    marginLeft: 12,
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
