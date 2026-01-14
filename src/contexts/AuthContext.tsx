import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { authService } from '../services/auth';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (email: string, username: string, password: string, displayName?: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refetchUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize - check if user is already logged in
  useEffect(() => {
    initAuth();
  }, []);

  // Auto-refresh user data when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && user) {
        // App just became active - refresh user data to get latest subscription status
        console.log('🔄 App became active, refreshing user data...');
        try {
          const userData = await authService.getMe();
          setUser(userData);
          console.log('✅ User data refreshed');
        } catch (error) {
          console.log('Failed to refresh user on app focus:', error);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  const initAuth = async () => {
    console.log('🔐 Initializing auth...');
    try {
      const token = await api.getToken();
      console.log('Token exists:', !!token);
      
      if (token) {
        try {
          const userData = await authService.getMe();
          console.log('User data loaded:', userData);
          setUser(userData);
          
          // Connect socket after successful auth
          await socketService.connect();
        } catch (error) {
          console.error('Failed to load user data:', error);
          // Token is invalid, clear it
          await api.clearToken();
        }
      }
    } catch (error) {
      console.error('Auth init error:', error);
      await api.clearToken();
    } finally {
      console.log('✅ Auth initialized');
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, remember = true) => {
    setLoading(true);
    try {
      const response = await authService.login({ email, password, remember });
      setUser(response.user);
      
      // Connect socket after login
      await socketService.connect();
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    username: string,
    password: string,
    displayName?: string,
    referralCode?: string
  ) => {
    setLoading(true);
    try {
      const response = await authService.register({
        email,
        username,
        password,
        displayName,
        referralCode,
      });
      setUser(response.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      socketService.disconnect();
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authService.getMe();
      setUser(userData);
    } catch (error) {
      console.error('Refresh user error:', error);
      // If refresh fails, user might be logged out
      await logout();
    }
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...data });
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
    refetchUser: refreshUser, // Alias for refreshUser
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
