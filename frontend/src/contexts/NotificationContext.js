import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const NotificationContext = createContext(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export const NotificationProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const pollRef = useRef(null);

  const api = useCallback(() => axios.create({
    baseURL: API,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }), [token]);

  // Check push support
  useEffect(() => {
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, []);

  // Register service worker
  useEffect(() => {
    if (!pushSupported) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, [pushSupported]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [notifRes, countRes] = await Promise.all([
        api().get('/notifications/?limit=20'),
        api().get('/notifications/unread-count'),
      ]);
      setNotifications(notifRes.data.notifications);
      setUnreadCount(countRes.data.count);
    } catch {
      // ignore
    }
  }, [isAuthenticated, api]);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api().get('/notifications/preferences');
      setPreferences(res.data);
    } catch {
      // ignore
    }
  }, [isAuthenticated, api]);

  // Update preferences
  const updatePreferences = useCallback(async (prefs) => {
    try {
      await api().put('/notifications/preferences', prefs);
      setPreferences(prev => ({ ...prev, ...prefs }));
    } catch {
      // ignore
    }
  }, [api]);

  // Mark all read
  const markAllRead = useCallback(async () => {
    try {
      await api().post('/notifications/mark-read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }, [api]);

  // Mark one read
  const markRead = useCallback(async (id) => {
    try {
      await api().post(`/notifications/mark-read/${id}`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  }, [api]);

  // Subscribe to push
  const subscribePush = useCallback(async () => {
    if (!pushSupported) return false;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      
      // Get VAPID key
      const vapidRes = await api().get('/notifications/vapid-key');
      const vapidKey = vapidRes.data.public_key;

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subJson = subscription.toJSON();
      await api().post('/notifications/subscribe', {
        endpoint: subJson.endpoint,
        keys: subJson.keys,
      });

      setPushEnabled(true);
      return true;
    } catch {
      return false;
    }
  }, [pushSupported, api]);

  // Unsubscribe from push
  const unsubscribePush = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        const subJson = subscription.toJSON();
        await api().delete('/notifications/subscribe', {
          data: { endpoint: subJson.endpoint, keys: subJson.keys },
        });
        await subscription.unsubscribe();
      }
      setPushEnabled(false);
    } catch {
      // ignore
    }
  }, [api]);

  // Check if already subscribed
  useEffect(() => {
    if (!pushSupported || !isAuthenticated) return;
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setPushEnabled(!!sub))
    ).catch(() => {});
  }, [pushSupported, isAuthenticated]);

  // Poll for new notifications
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
    fetchPreferences();
    pollRef.current = setInterval(fetchNotifications, 30000);
    return () => clearInterval(pollRef.current);
  }, [isAuthenticated, fetchNotifications, fetchPreferences]);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, preferences,
      pushSupported, pushEnabled,
      fetchNotifications, markAllRead, markRead,
      updatePreferences, subscribePush, unsubscribePush,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
