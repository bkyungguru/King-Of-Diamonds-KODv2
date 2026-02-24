import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { MessageSquare, Send, Loader2, Check, CheckCheck, User } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

export const MessagesPage = () => {
    const { user, api } = useAuth();
    const [searchParams] = useSearchParams();
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        const toUserId = searchParams.get('to');
        if (toUserId && !selectedConversation) {
            setSelectedConversation({ other_user_id: toUserId });
            fetchMessages(toUserId);
        }
    }, [searchParams]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!selectedConversation) return;

        const interval = setInterval(() => {
            checkTypingStatus();
            fetchMessages(selectedConversation.other_user_id);
        }, 3000);

        return () => clearInterval(interval);
    }, [selectedConversation]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchConversations = async () => {
        try {
            const response = await api().get('/messages/conversations');
            setConversations(response.data);
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (otherUserId) => {
        try {
            const response = await api().get(`/messages/conversation/${otherUserId}`);
            setMessages(response.data);
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    };

    const handleSelectConversation = (conv) => {
        setSelectedConversation(conv);
        fetchMessages(conv.other_user_id);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation) return;

        setSending(true);
        try {
            const response = await api().post('/messages/send', {
                recipient_id: selectedConversation.other_user_id,
                content: newMessage.trim()
            });
            setMessages(prev => [...prev, response.data]);
            setNewMessage('');
            fetchConversations();
        } catch (error) {
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleTyping = async () => {
        if (!selectedConversation) return;

        try {
            await api().post(`/messages/typing/${selectedConversation.other_user_id}?is_typing=true`);
        } catch (error) {
            // Ignore typing errors
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(async () => {
            try {
                await api().post(`/messages/typing/${selectedConversation.other_user_id}?is_typing=false`);
            } catch (error) {}
        }, 3000);
    };

    const checkTypingStatus = async () => {
        if (!selectedConversation) return;
        try {
            const response = await api().get(`/messages/typing/${selectedConversation.other_user_id}`);
            setOtherUserTyping(response.data.is_typing);
        } catch (error) {}
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        } else {
            handleTyping();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black" data-testid="messages-page">
            <Navbar />

            <main className="pt-16 h-screen flex">
                {/* Conversations List */}
                <div className="w-80 border-r border-white/10 flex flex-col">
                    <div className="p-4 border-b border-white/10">
                        <h2 className="font-heading text-lg gold-text">Messages</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {conversations.length === 0 ? (
                            <div className="p-6 text-center">
                                <MessageSquare className="w-10 h-10 text-gold/30 mx-auto mb-3" />
                                <p className="text-white/50 text-sm">No conversations yet</p>
                            </div>
                        ) : (
                            conversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => handleSelectConversation(conv)}
                                    className={`w-full p-4 flex items-center gap-3 border-b border-white/5 transition-colors hover:bg-white/5 ${
                                        selectedConversation?.other_user_id === conv.other_user_id ? 'bg-white/5' : ''
                                    }`}
                                    data-testid={`conversation-${conv.other_user_id}`}
                                >
                                    <Avatar className="w-12 h-12 border border-white/10">
                                        <AvatarImage src={conv.other_user_avatar} />
                                        <AvatarFallback className="bg-obsidian text-gold">
                                            {conv.other_user_name?.[0]?.toUpperCase() || <User className="w-5 h-5" />}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="text-white font-medium truncate">{conv.other_user_name || 'User'}</p>
                                        <p className="text-white/40 text-sm truncate">{conv.last_message}</p>
                                    </div>
                                    {conv.unread_count > 0 && (
                                        <span className="w-6 h-6 bg-gold text-black text-xs font-bold rounded-full flex items-center justify-center">
                                            {conv.unread_count}
                                        </span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 flex flex-col">
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-white/10 flex items-center gap-3">
                                <Avatar className="w-10 h-10 border border-white/10">
                                    <AvatarImage src={selectedConversation.other_user_avatar} />
                                    <AvatarFallback className="bg-obsidian text-gold">
                                        {selectedConversation.other_user_name?.[0]?.toUpperCase() || <User className="w-5 h-5" />}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-white font-medium">{selectedConversation.other_user_name || 'User'}</p>
                                    {otherUserTyping && (
                                        <p className="text-gold text-sm animate-pulse">typing...</p>
                                    )}
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                                        data-testid={`message-${msg.id}`}
                                    >
                                        <div className={`max-w-[70%] ${msg.sender_id === user?.id ? 'bg-gold text-black' : 'bg-white/10 text-white'} px-4 py-3 rounded-lg`}>
                                            <p>{msg.content}</p>
                                            <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${msg.sender_id === user?.id ? 'text-black/50' : 'text-white/40'}`}>
                                                <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {msg.sender_id === user?.id && (
                                                    msg.is_read ? <CheckCheck className="w-4 h-4" /> : <Check className="w-4 h-4" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-4 border-t border-white/10">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Type a message..."
                                        className="input-luxury flex-1 py-3"
                                        data-testid="message-input"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={sending || !newMessage.trim()}
                                        className="gold-btn p-3 disabled:opacity-50"
                                        data-testid="send-message-btn"
                                    >
                                        {sending ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Send className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <MessageSquare className="w-16 h-16 text-gold/30 mx-auto mb-4" />
                                <h3 className="font-heading text-lg text-white mb-2">Select a Conversation</h3>
                                <p className="text-white/50">Choose a conversation to start messaging</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MessagesPage;
