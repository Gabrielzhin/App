// Environment configuration
import { Platform } from 'react-native';

// ⚠️ IMPORTANT: Set this to true if testing on a physical Android device via Expo Go
const USE_PHYSICAL_DEVICE = true;

// Your computer's local IP address (for physical devices on same Wi-Fi)
const LOCAL_IP = '192.168.6.86';

// Get the correct API URL based on platform
const getApiUrl = () => {
  if (!__DEV__) {
    return 'https://your-production-api.com';
  }
  
  // If using physical device, use local IP regardless of platform
  if (USE_PHYSICAL_DEVICE) {
    return `http://${LOCAL_IP}:4000`;
  }
  
  // Development URLs for emulators/simulators
  if (Platform.OS === 'android') {
    // For Android Emulator: 10.0.2.2 is the host machine
    return 'http://10.0.2.2:4000';
  } else if (Platform.OS === 'ios') {
    // For iOS Simulator: localhost works
    return 'http://localhost:4000';
  } else {
    // For Web or other platforms
    return 'http://localhost:4000';
  }
};

export const CONFIG = {
  API_URL: getApiUrl(),
  
  // Supabase configuration (from your existing backend)
  SUPABASE_URL: '',  // Add your Supabase URL
  SUPABASE_ANON_KEY: '',  // Add your Supabase anon key
  
  // Stripe publishable key for in-app subscriptions
  STRIPE_PUBLISHABLE_KEY: '',
};
