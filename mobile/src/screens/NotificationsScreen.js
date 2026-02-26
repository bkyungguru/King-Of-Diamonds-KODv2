import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { colors } from '../theme';
import api from '../services/api';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get('/notifications/');
      setNotifications(res.data);
    } catch (e) {
      // Endpoint may not exist yet
      setNotifications([]);
    }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const renderItem = ({ item }) => (
    <View style={[s.item, !item.is_read && s.unread]}>
      <Text style={s.text}>{item.message || item.content || 'Notification'}</Text>
      <Text style={s.time}>{new Date(item.created_at).toLocaleDateString()}</Text>
    </View>
  );

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.gold} size="large" /></View>;

  return (
    <View style={s.container}>
      <View style={s.topBar}><Text style={s.title}>Notifications</Text></View>
      <FlatList
        data={notifications}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={colors.gold} />}
        contentContainerStyle={notifications.length === 0 ? s.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🔔</Text>
            <Text style={s.emptyTitle}>No notifications</Text>
            <Text style={s.emptyText}>You're all caught up!</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  center: { flex: 1, backgroundColor: colors.black, justifyContent: 'center', alignItems: 'center' },
  topBar: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.white10 },
  title: { color: colors.gold, fontSize: 22, fontWeight: '700' },
  item: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.white05 },
  unread: { backgroundColor: 'rgba(212,175,55,0.05)' },
  text: { color: colors.white, fontSize: 15, lineHeight: 20 },
  time: { color: colors.white30, fontSize: 12, marginTop: 6 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: colors.white, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  emptyText: { color: colors.white50, fontSize: 14 },
});
