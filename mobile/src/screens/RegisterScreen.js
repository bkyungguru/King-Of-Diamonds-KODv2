import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { colors } from '../theme';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!email || !password) return Alert.alert('Error', 'Email and password are required');
    if (password !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');
    if (password.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(email, password, username || null, displayName || null);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>♦ KING OF DIAMONDS</Text>
        <View style={s.card}>
          <Text style={s.title}>Join the Elite</Text>
          <Text style={s.subtitle}>Create your exclusive account</Text>

          <Text style={s.label}>EMAIL *</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail}
            placeholder="your@email.com" placeholderTextColor={colors.white30}
            keyboardType="email-address" autoCapitalize="none" />

          <View style={s.row}>
            <View style={s.half}>
              <Text style={s.label}>USERNAME</Text>
              <TextInput style={s.input} value={username} onChangeText={setUsername}
                placeholder="@username" placeholderTextColor={colors.white30} autoCapitalize="none" />
            </View>
            <View style={s.half}>
              <Text style={s.label}>DISPLAY NAME</Text>
              <TextInput style={s.input} value={displayName} onChangeText={setDisplayName}
                placeholder="Your Name" placeholderTextColor={colors.white30} />
            </View>
          </View>

          <Text style={s.label}>PASSWORD *</Text>
          <TextInput style={s.input} value={password} onChangeText={setPassword}
            placeholder="••••••••" placeholderTextColor={colors.white30} secureTextEntry />

          <Text style={s.label}>CONFIRM PASSWORD *</Text>
          <TextInput style={s.input} value={confirmPassword} onChangeText={setConfirmPassword}
            placeholder="••••••••" placeholderTextColor={colors.white30} secureTextEntry />

          <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.black} /> : <Text style={s.btnText}>Create Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.link}>
            <Text style={s.linkText}>Already have an account? <Text style={{ color: colors.gold }}>Sign in</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  logo: { color: colors.gold, fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 30, letterSpacing: 2 },
  card: { backgroundColor: colors.obsidian, borderWidth: 1, borderColor: colors.white10, borderRadius: 12, padding: 24 },
  title: { color: colors.gold, fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  subtitle: { color: colors.white50, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  label: { color: colors.white70, fontSize: 11, letterSpacing: 1.5, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: colors.white05, borderWidth: 1, borderColor: colors.white10, borderRadius: 8, color: colors.white, padding: 14, fontSize: 16 },
  btn: { backgroundColor: colors.gold, borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 24 },
  btnText: { color: colors.black, fontSize: 16, fontWeight: '700' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: colors.white50, fontSize: 14 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
});
