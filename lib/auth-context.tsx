'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, CompagnyUserProfile } from './api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: CompagnyUserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'subito_compagny_token';
const USER_KEY = 'subito_compagny_user';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<CompagnyUserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with loading = true
  const router = useRouter();

  // Load auth state from localStorage on mount (client-side only)
  useEffect(() => {
    const loadAuthState = () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken && storedToken !== 'undefined' && storedUser && storedUser !== 'undefined') {
          try {
            const parsedUser = JSON.parse(storedUser);
            setToken(storedToken);
            setUser(parsedUser);
          } catch {
            // Invalid JSON, clear storage
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
          }
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthState();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.authCompagny.login({ email, password });
    // Handle both wrapped { data: {...} } and direct response formats
    const data = response.data || response;

    // Extract token - handle both { access_token } and { token } formats
    const rawData = data as Record<string, unknown>;
    const accessToken = (rawData.access_token || rawData.token) as string;
    if (!accessToken) {
      console.error('Login response:', JSON.stringify(response));
      throw new Error('Token non recu du serveur');
    }

    setToken(accessToken);
    localStorage.setItem(TOKEN_KEY, accessToken);

    // If user data is in the login response, use it temporarily
    const userData = rawData.user as CompagnyUserProfile | undefined;
    if (userData && (userData.id || userData.nomCompagny)) {
      setUser(userData);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    }

    // Always fetch the full profile from /auth/compagny/profile
    try {
      const profileResponse = await api.authCompagny.getProfile(accessToken);
      // Handle both wrapped and direct response
      const profile = profileResponse.data || profileResponse;
      if (profile && (profile.id || profile.nomCompagny)) {
        setUser(profile as CompagnyUserProfile);
        localStorage.setItem(USER_KEY, JSON.stringify(profile));
      }
    } catch (err) {
      console.error('Error fetching profile after login:', err);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await api.authCompagny.logout(token);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      router.push('/login');
    }
  }, [token, router]);

  const refreshProfile = useCallback(async () => {
    if (!token) return;

    try {
      const response = await api.authCompagny.getProfile(token);
      // Handle both wrapped { data: {...} } and direct response
      const profile = response.data || response;
      setUser(profile as CompagnyUserProfile);
      localStorage.setItem(USER_KEY, JSON.stringify(profile));
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  }, [token]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
