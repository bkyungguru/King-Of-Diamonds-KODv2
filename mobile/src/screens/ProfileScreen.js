import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { colors } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function ProfileScreen() {
  const { user, isCreator, creatorProfile, logout, refreshUser } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/me', { username, display_name: displayName, bio });
      await refreshUser();
      Alert.alert('Success', 'Profile updated!');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to update');
    } finally { setSaving(false); }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.topBar}><Text style={s.title}>Profile</Text></View>

      {/* Avatar */}
      <View style={s.avatarSection}>
        <View style={s.avatar}>
          {user?.avatar_url
            ? <Image source={{ uri: user.avatar_url }} style={s.avatarImg} />
            : <Text style={s.avatarText}>{user?.display_name?.[0] || user?.email?.[0]?.toUpperCase() || '?'}</Text>}
        </View>
        <Text style={s.email}>{user?.email}</Text>
        {isCreator && <View style={s.creatorBadge}><Text style={s.creatorBadgeText}>♦ Creator</Text></View>}
      </View>

      {/* Form */}
      <View style={s.card}>
        <Text style={s.label}>USERNAME</Text>
        <TextInput style={s.input} value={username} onChangeText={setUsername}
          placeholder="@username" placeholderTextColor={colors.white30} autoCapitalize="none" />

        <Text style={s.label}>DISPLAY NAME</Text>
        <TextInput style={s.input} value={displayName} onChangeText={setDisplayName}
          placeholder="Your Name" placeholderTextColor={colors.white30} />

        <Text style={s.label}>BIO</Text>
        <TextInput style={[s.input, s.textArea]} value={bio} onChangeText={setBio}
          placeholder="Tell us about yourself..." placeholderTextColor={colors.white30}
          multiline numberOfLines={3} />

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.black} /> : <Text style={s.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>
      </View>

      {/* Creator Stats */}
      {isCreator && creatorProfile && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Creator Stats</Text>
          <View style={s.statRow}>
            <Text style={s.statLabel}>Subscribers</Text>
            <Text style={s.statValue}>{creatorProfile.subscriber_count}</Text>
          </View>
          <View style={s.statRow}>
            <Text style={s.statLabel}>Earnings</Text>
            <Text style={[s.statValue, { color: colors.gold }]}>${creatorProfile.total_earnings?.toFixed(2)}</Text>
          </View>
          <View style={s.statRow}>
            <Text style={s.statLabel}>Price</Text>
            <Text style={s.statValue}>${creatorProfile.subscription_price}/mo</Text>
          </View>
        </View>
      )}

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Text style={s.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  content: { paddingBottom: 40 },
  topBar: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.white10 },
  title: { color: colors.gold, fontSize: 22, fontWeight: '700' },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(212,175,55,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(212,175,55,0.3)', overflow: 'hidden' },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { color: colors.gold, fontSize: 28, fontWeight: '700' },
  email: { color: colors.white50, fontSize: 14, marginTop: 8 },
  creatorBadge: { backgroundColor: 'rgba(212,175,55,0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  creatorBadgeText: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  card: { backgroundColor: colors.obsidian, borderWidth: 1, borderColor: colors.white10, borderRadius: 12, padding: 20, marginHorizontal: 16, marginBottom: 16 },
  cardTitle: { color: colors.gold, fontSize: 17, fontWeight: '700', marginBottom: 16 },
  label: { color: colors.white70, fontSize: 11, letterSpacing: 1.5, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: colors.white05, borderWidth: 1, borderColor: colors.white10, borderRadius: 8, color: colors.white, padding: 14, fontSize: 15 },
  textArea: { height: 80, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: colors.gold, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: colors.black, fontSize: 15, fontWeight: '700' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.white05 },
  statLabel: { color: colors.white50, fontSize: 14 },
  statValue: { color: colors.white, fontSize: 14, fontWeight: '600' },
  logoutBtn: { marginHorizontal: 16, marginTop: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: 14, alignItems: 'center' },
  logoutText: { color: colors.red, fontSize: 15, fontWeight: '600' },
});
