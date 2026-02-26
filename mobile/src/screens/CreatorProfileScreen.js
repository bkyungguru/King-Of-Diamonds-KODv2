import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { colors } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function CreatorProfileScreen({ route, navigation }) {
  const { creatorId } = route.params;
  const { isAuthenticated, user } = useAuth();
  const [creator, setCreator] = useState(null);
  const [content, setContent] = useState([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [creatorRes, contentRes] = await Promise.all([
        api.get(`/creators/${creatorId}`),
        api.get(`/content/creator/${creatorId}`),
      ]);
      setCreator(creatorRes.data);
      setContent(contentRes.data);
      if (isAuthenticated) {
        try {
          const subRes = await api.get(`/subscriptions/check/${creatorId}`);
          setIsSubscribed(subRes.data.is_subscribed);
        } catch { }
      }
    } catch {
      Alert.alert('Error', 'Creator not found');
      navigation.goBack();
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, [creatorId]);

  const handleSubscribe = async () => {
    if (!isAuthenticated) return Alert.alert('Login Required', 'Please login to subscribe');
    setSubscribing(true);
    try {
      await api.post('/subscriptions/subscribe', { creator_id: creatorId });
      setIsSubscribed(true);
      fetchData();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to subscribe');
    } finally { setSubscribing(false); }
  };

  const handleLike = async (contentId) => {
    try {
      const res = await api.post(`/content/${contentId}/like`);
      setContent(prev => prev.map(item =>
        item.id === contentId
          ? { ...item, is_liked: res.data.liked, like_count: item.like_count + (res.data.liked ? 1 : -1) }
          : item
      ));
    } catch {}
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.gold} size="large" /></View>;
  if (!creator) return null;

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.gold} />}>
      {/* Cover */}
      <View style={s.cover}>
        {creator.cover_image_url
          ? <Image source={{ uri: creator.cover_image_url }} style={s.coverImg} />
          : <View style={s.coverPlaceholder} />}
      </View>

      {/* Profile */}
      <View style={s.profileSection}>
        <View style={s.avatarWrap}>
          {creator.profile_image_url
            ? <Image source={{ uri: creator.profile_image_url }} style={s.avatar} />
            : <View style={[s.avatar, s.avatarPlaceholder]}><Text style={s.avatarText}>♦</Text></View>}
        </View>

        <View style={s.nameRow}>
          <Text style={s.name}>{creator.display_name}</Text>
          {creator.is_verified && <Text style={s.verified}> ✓</Text>}
          {creator.online_status === 'online' && <Text style={s.online}> ● Online</Text>}
        </View>

        <Text style={s.stats}>{creator.subscriber_count} subscribers  •  ${creator.subscription_price}/mo</Text>
        {creator.bio ? <Text style={s.bio}>{creator.bio}</Text> : null}

        <View style={s.actions}>
          {isSubscribed ? (
            <>
              <TouchableOpacity style={s.subscribedBtn}>
                <Text style={s.subscribedText}>✓ Subscribed</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.msgBtn} onPress={() => navigation.navigate('Conversation', {
                otherUserId: creator.user_id, otherUserName: creator.display_name,
              })}>
                <Text style={s.msgBtnText}>💬 Message</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={s.subBtn} onPress={handleSubscribe} disabled={subscribing}>
              {subscribing
                ? <ActivityIndicator color={colors.black} />
                : <Text style={s.subBtnText}>♦ Subscribe ${creator.subscription_price}/mo</Text>}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={s.contentSection}>
        <Text style={s.sectionTitle}>Content</Text>
        {content.length === 0 ? (
          <View style={s.empty}><Text style={s.emptyText}>No content yet</Text></View>
        ) : content.map(item => (
          <View key={item.id} style={s.card}>
            {!item.is_public && !isSubscribed ? (
              <View style={s.locked}>
                <Text style={s.lockedIcon}>🔒</Text>
                <Text style={s.lockedText}>Subscribe to unlock</Text>
              </View>
            ) : (
              <>
                {item.title ? <Text style={s.postTitle}>{item.title}</Text> : null}
                {item.text ? <Text style={s.postText}>{item.text}</Text> : null}
                {item.media_urls?.length > 0 && (
                  <TouchableOpacity onPress={() => navigation.navigate('ImageView', { uri: item.media_urls[0] })}>
                    <Image source={{ uri: item.media_urls[0] }} style={s.media} resizeMode="cover" />
                  </TouchableOpacity>
                )}
              </>
            )}
            <View style={s.postActions}>
              <TouchableOpacity onPress={() => handleLike(item.id)} style={s.likeBtn}>
                <Text style={{ color: item.is_liked ? colors.red : colors.white50 }}>
                  {item.is_liked ? '❤️' : '🤍'} {item.like_count || 0}
                </Text>
              </TouchableOpacity>
              <Text style={s.postDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  center: { flex: 1, backgroundColor: colors.black, justifyContent: 'center', alignItems: 'center' },
  cover: { height: 200 },
  coverImg: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, backgroundColor: 'rgba(212,175,55,0.1)' },
  profileSection: { padding: 16, marginTop: -40 },
  avatarWrap: { marginBottom: 12 },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: colors.black },
  avatarPlaceholder: { backgroundColor: 'rgba(212,175,55,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: colors.gold, fontSize: 32 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  name: { color: colors.white, fontSize: 24, fontWeight: '700' },
  verified: { color: colors.gold, fontSize: 18 },
  online: { color: colors.green, fontSize: 12 },
  stats: { color: colors.white50, fontSize: 14, marginBottom: 8 },
  bio: { color: colors.white70, fontSize: 15, lineHeight: 22, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 10 },
  subBtn: { flex: 1, backgroundColor: colors.gold, borderRadius: 8, padding: 14, alignItems: 'center' },
  subBtnText: { color: colors.black, fontSize: 15, fontWeight: '700' },
  subscribedBtn: { backgroundColor: colors.white10, borderRadius: 8, padding: 14, paddingHorizontal: 20 },
  subscribedText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  msgBtn: { backgroundColor: colors.white10, borderRadius: 8, padding: 14, paddingHorizontal: 20 },
  msgBtnText: { color: colors.white, fontSize: 14 },
  contentSection: { padding: 16 },
  sectionTitle: { color: colors.white, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: { backgroundColor: colors.obsidian, borderWidth: 1, borderColor: colors.white10, borderRadius: 12, padding: 16, marginBottom: 12 },
  locked: { height: 150, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white05, borderRadius: 8 },
  lockedIcon: { fontSize: 32, marginBottom: 8 },
  lockedText: { color: colors.white50, fontSize: 14 },
  postTitle: { color: colors.white, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  postText: { color: colors.white70, fontSize: 15, lineHeight: 22, marginBottom: 12 },
  media: { width: '100%', height: 220, borderRadius: 8, marginBottom: 12, backgroundColor: colors.white05 },
  postActions: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.white10 },
  likeBtn: {},
  postDate: { color: colors.white30, fontSize: 12 },
  empty: { padding: 40, alignItems: 'center', backgroundColor: colors.obsidian, borderRadius: 12, borderWidth: 1, borderColor: colors.white10 },
  emptyText: { color: colors.white50, fontSize: 15 },
});
