import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatorProfile, setCreatorProfile] = useState(null);

  const fetchUser = useCallback(async () => {
    const t = await SecureStore.getItemAsync('kod_token');
    if (!t) { setLoading(false); return; }
    setToken(t);
    try {
      const res = await api.get('/users/me');
      setUser(res.data);
      if (['creator', 'admin', 'superadmin'].includes(res.data.role)) {
        try {
          const cr = await api.get('/creators/me');
          setCreatorProfile(cr.data);
        } catch { setCreatorProfile(null); }
      }
    } catch {
      await SecureStore.deleteItemAsync('kod_token');
      setToken(null);
      setUser(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = res.data;
    await SecureStore.setItemAsync('kod_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, username, displayName) => {
    const res = await api.post('/auth/register', {
      email, password, username, display_name: displayName,
    });
    const { token: newToken, user: userData } = res.data;
    await SecureStore.setItemAsync('kod_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('kod_token');
    setToken(null);
    setUser(null);
    setCreatorProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading, creatorProfile,
      isAuthenticated: !!user,
      isCreator: ['creator', 'admin', 'superadmin'].includes(user?.role),
      login, register, logout, refreshUser: fetchUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
