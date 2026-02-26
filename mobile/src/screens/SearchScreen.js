import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, Image, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { colors } from '../theme';
import api from '../services/api';

export default function SearchScreen({ navigation }) {
  const [creators, setCreators] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCreators = useCallback(async () => {
    try {
      const res = await api.get('/creators/');
      setCreators(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchCreators(); }, [fetchCreators]);

  const filtered = creators.filter(c =>
    c.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.bio?.toLowerCase().includes(search.toLowerCase())
  );

  const renderCreator = ({ item }) => (
    <TouchableOpacity style={s.card} onPress={() => navigation.navigate('CreatorProfile', { creatorId: item.id })}>
      <View style={s.imageWrap}>
        {item.profile_image_url
          ? <Image source={{ uri: item.profile_image_url }} style={s.image} />
          : <View style={s.placeholder}><Text style={s.placeholderText}>♦</Text></View>}
        {item.online_status === 'online' && <View style={s.onlineBadge}><Text style={s.onlineText}>● Online</Text></View>}
      </View>
      <View style={s.info}>
        <View style={s.nameRow}>
          <Text style={s.name} numberOfLines={1}>{item.display_name}</Text>
          {item.is_verified && <Text style={s.verified}>✓</Text>}
        </View>
        <Text style={s.subs}>{item.subscriber_count} subscribers</Text>
        <Text style={s.price}>${item.subscription_price}/mo</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.gold} size="large" /></View>;

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <Text style={s.title}>Explore Creators</Text>
        <TextInput style={s.searchInput} value={search} onChangeText={setSearch}
          placeholder="Search creators..." placeholderTextColor={colors.white30} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={renderCreator}
        numColumns={2}
        columnWrapperStyle={s.row}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCreators(); }} tintColor={colors.gold} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>{search ? 'No creators found' : 'No creators yet'}</Text>
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
  title: { color: colors.gold, fontSize: 22, fontWeight: '700', marginBottom: 12 },
  searchInput: { backgroundColor: colors.white05, borderWidth: 1, borderColor: colors.white10, borderRadius: 8, color: colors.white, padding: 12, fontSize: 15 },
  list: { padding: 8 },
  row: { gap: 8 },
  card: { flex: 1, backgroundColor: colors.obsidian, borderWidth: 1, borderColor: colors.white10, borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  imageWrap: { aspectRatio: 0.75, position: 'relative' },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, backgroundColor: 'rgba(212,175,55,0.1)', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: colors.gold, fontSize: 36, opacity: 0.5 },
  onlineBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  onlineText: { color: colors.white, fontSize: 10, fontWeight: '600' },
  info: { padding: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { color: colors.white, fontSize: 14, fontWeight: '700', flex: 1 },
  verified: { color: colors.gold, fontSize: 14 },
  subs: { color: colors.white50, fontSize: 12, marginTop: 2 },
  price: { color: colors.gold, fontSize: 13, fontWeight: '600', marginTop: 4 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: colors.white50, fontSize: 15 },
});
