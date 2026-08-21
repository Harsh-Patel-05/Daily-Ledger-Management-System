import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getStoredUser,
  getTokens,
  clearAuthStorage,
} from '../api/client';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tokens = getTokens();
        const stored = getStoredUser();
        if (tokens?.access) {
          if (stored) setUser(stored);
          try {
            const me = await authApi.fetchMe();
            if (!cancelled) setUser(me);
          } catch {
            clearAuthStorage();
            if (!cancelled) setUser(null);
          }
        } else {
          clearAuthStorage();
          if (!cancelled) setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await authApi.login(email, password);
    const { detail, message, apiMessage, success, ...user } = result || {};
    setUser(user);
    return result;
  }, []);

  const register = useCallback(async (payload) => {
    const result = await authApi.register(payload);
    const { detail, message, apiMessage, success, ...user } = result || {};
    setUser(user);
    return result;
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await authApi.fetchMe();
    setUser(me);
    return me;
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    forgotPassword: authApi.forgotPassword,
    verifyOtp: authApi.verifyOtp,
    resetPassword: authApi.resetPassword,
    changePassword: authApi.changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
