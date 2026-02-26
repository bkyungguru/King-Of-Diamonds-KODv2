import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { colors } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await api.get('/content/feed');
      setFeed(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const onRefresh = () => { setRefreshing(true); fetchFeed(); };

  const handleLike = async (contentId) => {
    try {
      const res = await api.post(`/content/${contentId}/like`);
      setFeed(prev => prev.map(item =>
        item.id === contentId
          ? { ...item, is_liked: res.data.liked, like_count: item.like_count + (res.data.liked ? 1 : -1) }
          : item
      ));
    } catch {}
  };

  const renderItem = ({ item }) => (
    <View style={s.card}>
      <TouchableOpacity style={s.header} onPress={() => navigation.navigate('CreatorProfile', { creatorId: item.creator_id })}>
        <View style={s.avatar}>
          {item.creator_profile_image
            ? <Image source={{ uri: item.creator_profile_image }} style={s.avatarImg} />
            : <Text style={s.avatarText}>♦</Text>}
        </View>
        <View>
          <Text style={s.creatorName}>{item.creator_display_name || 'Creator'}</Text>
          <Text style={s.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
      </TouchableOpacity>

      {item.title ? <Text style={s.postTitle}>{item.title}</Text> : null}
      {item.text ? <Text style={s.postText}>{item.text}</Text> : null}

      {item.media_urls?.length > 0 && (
        <TouchableOpacity onPress={() => navigation.navigate('ImageView', { uri: item.media_urls[0] })}>
          <Image source={{ uri: item.media_urls[0] }} style={s.media} resizeMode="cover" />
        </TouchableOpacity>
      )}

      <View style={s.actions}>
        <TouchableOpacity style={s.actionBtn} onPress={() => handleLike(item.id)}>
          <Text style={[s.actionIcon, item.is_liked && { color: colors.red }]}>
            {item.is_liked ? '❤️' : '🤍'}
          </Text>
          <Text style={s.actionCount}>{item.like_count || 0}</Text>
        </TouchableOpacity>
        <View style={s.actionBtn}>
          <Text style={s.actionIcon}>💬</Text>
          <Text style={s.actionCount}>{item.comment_count || 0}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.gold} size="large" /></View>;

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <Text style={s.logo}>♦ KING OF DIAMONDS</Text>
      </View>
      <FlatList
        data={feed}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        contentContainerStyle={feed.length === 0 ? s.emptyContainer : s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>♦</Text>
            <Text style={s.emptyTitle}>No Content Yet</Text>
            <Text style={s.emptyText}>Subscribe to creators to see their content here</Text>
            <TouchableOpacity style={s.exploreBtn} onPress={() => navigation.navigate('SearchTab')}>
              <Text style={s.exploreBtnText}>Explore Creators</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  center: { flex: 1, backgroundColor: colors.black, justifyContent: 'center', alignItems: 'center' },
  topBar: { paddingTop: 50, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.white10 },
  logo: { color: colors.gold, fontSize: 18, fontWeight: '700', letterSpacing: 2, textAlign: 'center' },
  list: { padding: 12 },
  card: { backgroundColor: colors.obsidian, borderWidth: 1, borderColor: colors.white10, borderRadius: 12, padding: 16, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(212,175,55,0.2)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { color: colors.gold, fontSize: 20 },
  creatorName: { color: colors.white, fontSize: 15, fontWeight: '600' },
  date: { color: colors.white30, fontSize: 12 },
  postTitle: { color: colors.white, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  postText: { color: colors.white70, fontSize: 15, lineHeight: 22, marginBottom: 12 },
  media: { width: '100%', height: 250, borderRadius: 8, marginBottom: 12, backgroundColor: colors.white05 },
  actions: { flexDirection: 'row', gap: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.white10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionIcon: { fontSize: 18 },
  actionCount: { color: colors.white50, fontSize: 14 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', padding: 40 },
  emptyIcon: { color: colors.gold, fontSize: 48, opacity: 0.3, marginBottom: 16 },
  emptyTitle: { color: colors.white, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: colors.white50, fontSize: 14, textAlign: 'center', marginBottom: 20 },
  exploreBtn: { backgroundColor: colors.gold, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
  exploreBtnText: { color: colors.black, fontSize: 15, fontWeight: '700' },
});
