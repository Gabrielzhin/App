import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type RootStackParamList = {
  SubscriptionCancel: undefined;
  PricingScreen: undefined;
  ProfileMain: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'SubscriptionCancel'>;

export default function SubscriptionCancelScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="close-circle-outline" size={80} color="#9ca3af" />
      
      <Text style={styles.title}>Subscription Cancelled</Text>
      
      <Text style={styles.message}>
        You've cancelled the subscription process. No charges have been made to your account.
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => navigation.navigate('PricingScreen')}
        >
          <Text style={styles.buttonText}>View Plans Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate('ProfileMain')}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Back to Profile
          </Text>
        </TouchableOpacity>
      </View>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f9fafb',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#8b5cf6',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4b5563',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#9ca3af',
  },
});
