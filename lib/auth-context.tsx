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
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load auth state from localStorage and validate token on mount
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        console.log(`[AUTH] loadAuthState | token: ${storedToken ? 'YES (' + storedToken.substring(0, 20) + '...)' : 'NO'} | user: ${storedUser ? 'YES' : 'NO'}`);

        if (!storedToken || storedToken === 'undefined') {
          console.log('[AUTH] No token in localStorage');
          return;
        }

        // We have a token — validate it by calling the profile endpoint
        try {
          console.log('[AUTH] Validating token via profile endpoint...');
          const profileResponse = await api.authCompagny.getProfile(storedToken);
          const profile = profileResponse.data || profileResponse;

          if (profile && (profile.id || profile.nomCompagny || profile.raisonSociale)) {
            setToken(storedToken);
            setUser(profile as CompagnyUserProfile);
            localStorage.setItem(USER_KEY, JSON.stringify(profile));
            console.log('[AUTH] Token valid, profile loaded OK');
          } else {
            // Profile response is empty/invalid
            console.warn('[AUTH] Profile response invalid, clearing auth');
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
          }
        } catch {
          // Token is expired/invalid — clean up
          console.warn('[AUTH] Token validation failed (401 or error), clearing auth');
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      } catch (error) {
        console.error('[AUTH] Error loading auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthState();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    console.log('[AUTH] login() called');
    const response = await api.authCompagny.login({ email, password });
    console.log('[AUTH] login API response:', JSON.stringify(response).substring(0, 200));

    // Handle both wrapped { data: {...} } and direct response formats
    const data = response.data || response;

    // Extract token - handle both { access_token } and { token } formats
    const rawData = data as Record<string, unknown>;
    const accessToken = (rawData.access_token || rawData.token) as string;
    if (!accessToken) {
      console.error('[AUTH] NO TOKEN in response! Full response:', JSON.stringify(response));
      throw new Error('Token non recu du serveur');
    }

    console.log(`[AUTH] Token received: ${accessToken.substring(0, 30)}...`);
    setToken(accessToken);
    localStorage.setItem(TOKEN_KEY, accessToken);

    // If user data is in the login response, use it temporarily
    const userData = rawData.user as CompagnyUserProfile | undefined;
    const loginRole = rawData.role as string | undefined;
    console.log(`[AUTH] User in login response: ${userData ? 'YES (id=' + userData.id + ')' : 'NO'} | role: ${loginRole || 'N/A'}`);
    if (userData && (userData.id || userData.nomCompagny || userData.raisonSociale)) {
      if (loginRole) userData.role = loginRole;
      setUser(userData);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    }

    // Fetch the full profile
    try {
      console.log('[AUTH] Fetching profile...');
      const profileResponse = await api.authCompagny.getProfile(accessToken);
      console.log('[AUTH] Profile response:', JSON.stringify(profileResponse).substring(0, 200));
      const profile = profileResponse.data || profileResponse;
      if (profile && (profile.id || profile.nomCompagny || profile.raisonSociale)) {
        setUser(profile as CompagnyUserProfile);
        localStorage.setItem(USER_KEY, JSON.stringify(profile));
        console.log('[AUTH] Profile saved OK');
      } else {
        console.warn('[AUTH] Profile response has no id or nomCompagny:', profile);
      }
    } catch (err) {
      console.error('[AUTH] Error fetching profile after login:', err);
    }

    // Final state check
    const finalToken = localStorage.getItem(TOKEN_KEY);
    const finalUser = localStorage.getItem(USER_KEY);
    console.log(`[AUTH] login() done | token in storage: ${!!finalToken} | user in storage: ${!!finalUser}`);
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
