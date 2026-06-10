'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, CompagnyUserProfile } from './api';
import { useRouter } from 'next/navigation';
import { registerPushNotifications } from './firebase';

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
const REFRESH_TOKEN_KEY = 'subito_compagny_refresh_token';
const USER_KEY = 'subito_compagny_user';
const COOKIE_NAME = 'subito_token';

function setTokenCookie(token: string) {
  document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function removeTokenCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

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
        // Try refresh if we have a stored refresh token but no valid access token
        const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);

        try {
          console.log('[AUTH] Validating token via profile endpoint...');
          const profileResponse = await api.authCompagny.getProfile(storedToken);
          const profile = profileResponse.data || profileResponse;

          if (profile && (profile.id || profile.nomCompagny || profile.raisonSociale)) {
            setToken(storedToken);
            setUser(profile as CompagnyUserProfile);
            localStorage.setItem(USER_KEY, JSON.stringify(profile));
            setTokenCookie(storedToken);
            console.log('[AUTH] Token valid, profile loaded OK');
            // Re-enregistrer FCM au chargement (non bloquant)
            registerPushNotifications(async (fcmToken) => { await api.authCompagny.updateFcmToken(fcmToken); }).catch(() => {});
          } else {
            console.warn('[AUTH] Profile response invalid, clearing auth');
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            removeTokenCookie();
          }
        } catch (profileErr) {
          const errMsg = (profileErr as Error)?.message || '';
          const isServerError = errMsg.includes('indisponible') || errMsg.includes('500');

          if (isServerError && storedUser) {
            // 500 = bug backend, pas token expiré — on garde la session avec les données stockées
            console.warn('[AUTH] Profile 500 (bug backend) — session maintenue avec données localStorage');
            try {
              setToken(storedToken);
              setUser(JSON.parse(storedUser));
              setTokenCookie(storedToken);
            } catch { /* JSON corrompu, continuer vers refresh */ }
            return;
          }

          // Token expiré (401) — essayer refresh avant de déconnecter
          console.warn('[AUTH] Token validation failed, trying refresh...');
          try {
            const refreshToken = storedRefresh || storedToken;
            const refreshResponse = await api.authCompagny.refreshToken(refreshToken);
            const refreshData = (refreshResponse as unknown as Record<string, unknown>)?.data ?? refreshResponse;
            const rd = refreshData as Record<string, unknown>;
            const newToken = (rd.accessToken || rd.access_token) as string;
            const newRefresh = (rd.refreshToken || rd.refresh_token) as string | undefined;

            if (newToken) {
              console.log('[AUTH] Token refreshed successfully on mount');
              localStorage.setItem(TOKEN_KEY, newToken);
              if (newRefresh) localStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);
              setTokenCookie(newToken);

              // Validate the new token
              const profileResponse = await api.authCompagny.getProfile(newToken);
              const profile = profileResponse.data || profileResponse;
              if (profile && (profile.id || profile.nomCompagny || profile.raisonSociale)) {
                setToken(newToken);
                setUser(profile as CompagnyUserProfile);
                localStorage.setItem(USER_KEY, JSON.stringify(profile));
                console.log('[AUTH] Profile loaded with refreshed token');
              }
            } else {
              throw new Error('No token in refresh response');
            }
          } catch {
            console.warn('[AUTH] Refresh also failed, clearing auth');
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            removeTokenCookie();
          }
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

    // Extract token — handle access_token (snake), accessToken (camel), token
    const rawData = data as unknown as Record<string, unknown>;
    const accessToken = (rawData.accessToken || rawData.access_token || rawData.token) as string;
    const refreshToken = (rawData.refreshToken || rawData.refresh_token) as string | undefined;
    if (!accessToken) {
      console.error('[AUTH] NO TOKEN in response! Full response:', JSON.stringify(response));
      throw new Error('Token non recu du serveur');
    }

    console.log(`[AUTH] Token received: ${accessToken.substring(0, 30)}...`);
    setToken(accessToken);
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    setTokenCookie(accessToken);

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

    // Enregistrer les notifications push (non bloquant)
    registerPushNotifications(async (fcmToken) => { await api.authCompagny.updateFcmToken(fcmToken); }).catch((err) =>
      console.warn('[AUTH] FCM registration failed:', err)
    );
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
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      removeTokenCookie();
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
