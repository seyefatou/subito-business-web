'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, AdminProfile } from './api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: AdminProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'subito_admin_token';
const USER_KEY = 'subito_admin_user';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AdminProfile | null>(null);
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
    const response = await api.authAdmin.login({ email, password });
    const { access_token, user } = response.data;

    setToken(access_token);
    setUser(user);

    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await api.authAdmin.logout(token);
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
      const response = await api.authAdmin.getProfile(token);
      setUser(response.data);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data));
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
