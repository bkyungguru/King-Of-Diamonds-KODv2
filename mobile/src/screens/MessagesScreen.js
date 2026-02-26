import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { colors } from '../theme';
import api from '../services/api';

export default function MessagesScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={s.item} onPress={() => navigation.navigate('Conversation', {
      otherUserId: item.other_user_id, otherUserName: item.other_user_name,
    })}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{item.other_user_name?.[0]?.toUpperCase() || '?'}</Text>
      </View>
      <View style={s.info}>
        <Text style={s.name}>{item.other_user_name || 'User'}</Text>
        <Text style={s.lastMsg} numberOfLines={1}>{item.last_message}</Text>
      </View>
      {item.unread_count > 0 && (
        <View style={s.badge}><Text style={s.badgeText}>{item.unread_count}</Text></View>
      )}
    </TouchableOpacity>
  );

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.gold} size="large" /></View>;

  return (
    <View style={s.container}>
      <View style={s.topBar}><Text style={s.title}>Messages</Text></View>
      <FlatList
        data={conversations}
        keyExtractor={i => i.id || i.other_user_id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={colors.gold} />}
        contentContainerStyle={conversations.length === 0 ? s.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>💬</Text>
            <Text style={s.emptyTitle}>No conversations yet</Text>
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
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.white05 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(212,175,55,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: colors.gold, fontSize: 18, fontWeight: '700' },
  info: { flex: 1, marginLeft: 12 },
  name: { color: colors.white, fontSize: 15, fontWeight: '600' },
  lastMsg: { color: colors.white50, fontSize: 13, marginTop: 2 },
  badge: { backgroundColor: colors.gold, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: colors.black, fontSize: 11, fontWeight: '700' },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: colors.white50, fontSize: 16 },
});
