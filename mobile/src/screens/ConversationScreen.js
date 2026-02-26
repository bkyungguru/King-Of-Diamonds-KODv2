import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function ConversationScreen({ route }) {
  const { otherUserId, otherUserName } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatRef = useRef();

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/messages/conversation/${otherUserId}`);
      setMessages(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [otherUserId]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await api.post('/messages/send', { recipient_id: otherUserId, content: text.trim() });
      setMessages(prev => [...prev, res.data]);
      setText('');
    } catch {}
    finally { setSending(false); }
  };

  const renderItem = ({ item }) => {
    const mine = item.sender_id === user?.id;
    return (
      <View style={[s.msgRow, mine && s.msgRowRight]}>
        <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleOther]}>
          <Text style={[s.msgText, mine && { color: colors.black }]}>{item.content}</Text>
          <Text style={[s.time, mine && { color: 'rgba(0,0,0,0.4)' }]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {mine && (item.is_read ? ' ✓✓' : ' ✓')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
      />
      <View style={s.inputBar}>
        <TextInput style={s.input} value={text} onChangeText={setText}
          placeholder="Type a message..." placeholderTextColor={colors.white30}
          multiline />
        <TouchableOpacity style={[s.sendBtn, !text.trim() && { opacity: 0.4 }]} onPress={send} disabled={sending || !text.trim()}>
          <Text style={s.sendText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  list: { padding: 12, paddingBottom: 8 },
  msgRow: { marginBottom: 8, flexDirection: 'row' },
  msgRowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '75%', borderRadius: 12, padding: 12 },
  bubbleMine: { backgroundColor: colors.gold, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.white10, borderBottomLeftRadius: 4 },
  msgText: { color: colors.white, fontSize: 15, lineHeight: 20 },
  time: { color: colors.white30, fontSize: 11, marginTop: 4, textAlign: 'right' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 8, borderTopWidth: 1, borderTopColor: colors.white10, gap: 8 },
  input: { flex: 1, backgroundColor: colors.white05, borderWidth: 1, borderColor: colors.white10, borderRadius: 20, color: colors.white, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { backgroundColor: colors.gold, width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  sendText: { color: colors.black, fontSize: 20 },
});
