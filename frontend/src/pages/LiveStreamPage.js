import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { Video, VideoOff, Mic, MicOff, Users, DollarSign, Send, X, Radio, Crown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

export const LiveStreamPage = () => {
    const { streamId } = useParams();
    const navigate = useNavigate();
    const { user, api, isCreator } = useAuth();
    const [stream, setStream] = useState(null);
    const [isStreamer, setIsStreamer] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [viewerCount, setViewerCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [tipAmount, setTipAmount] = useState(5);
    const [showTipModal, setShowTipModal] = useState(false);
    
    // WebRTC refs
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const chatContainerRef = useRef(null);

    useEffect(() => {
        if (streamId) {
            fetchStream();
            const interval = setInterval(fetchChat, 2000);
            return () => {
                clearInterval(interval);
                leaveStream();
            };
        }
    }, [streamId]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchStream = async () => {
        try {
            const response = await api().get(`/livestream/${streamId}`);
            setStream(response.data);
            setViewerCount(response.data.viewer_count);
            
            // Check if current user is the streamer
            const creatorRes = await api().get('/creators/me').catch(() => null);
            if (creatorRes?.data?.id === response.data.creator_id) {
                setIsStreamer(true);
            } else {
                // Join as viewer
                await api().post(`/livestream/${streamId}/join`);
            }
        } catch (error) {
            toast.error('Stream not found');
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const fetchChat = async () => {
        try {
            const response = await api().get(`/livestream/${streamId}/chat`);
            setMessages(response.data);
        } catch (error) {
            // Silently fail
        }
    };

    const startStream = async () => {
        try {
            // Get media stream
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            localStreamRef.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            
            // Start stream on backend
            await api().post(`/livestream/${streamId}/start`);
            toast.success('Stream started!');
            setStream(prev => ({ ...prev, status: 'live' }));
        } catch (error) {
            toast.error('Failed to start stream: ' + error.message);
        }
    };

    const endStream = async () => {
        try {
            // Stop local stream
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            
            await api().post(`/livestream/${streamId}/end`);
            toast.success('Stream ended');
            navigate('/creator/dashboard');
        } catch (error) {
            toast.error('Failed to end stream');
        }
    };

    const leaveStream = async () => {
        if (!isStreamer && streamId) {
            try {
                await api().post(`/livestream/${streamId}/leave`);
            } catch (error) {
                // Silently fail
            }
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim()) return;
        
        try {
            await api().post(`/livestream/${streamId}/chat?message=${encodeURIComponent(newMessage)}`);
            setNewMessage('');
            fetchChat();
        } catch (error) {
            toast.error('Failed to send message');
        }
    };

    const sendTip = async () => {
        try {
            await api().post(`/livestream/${streamId}/tip?amount=${tipAmount}`);
            toast.success(`Sent $${tipAmount} tip!`);
            setShowTipModal(false);
            fetchChat();
        } catch (error) {
            toast.error('Failed to send tip');
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
        <div className="min-h-screen bg-black" data-testid="livestream-page">
            <Navbar />

            <main className="pt-16 h-screen flex">
                {/* Video Area */}
                <div className="flex-1 flex flex-col">
                    {/* Stream Header */}
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar className="w-10 h-10 border border-gold/30">
                                <AvatarImage src={stream?.creator_profile_image} />
                                <AvatarFallback className="bg-obsidian text-gold">
                                    {stream?.creator_display_name?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h1 className="text-white font-medium">{stream?.title}</h1>
                                <p className="text-white/50 text-sm">{stream?.creator_display_name}</p>
                            </div>
                            {stream?.status === 'live' && (
                                <span className="flex items-center gap-2 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                                    <Radio className="w-3 h-3 animate-pulse" />
                                    LIVE
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-2 text-white/70">
                                <Users className="w-4 h-4" />
                                {viewerCount}
                            </span>
                            <span className="flex items-center gap-2 text-gold">
                                <DollarSign className="w-4 h-4" />
                                ${stream?.total_tips?.toFixed(2) || '0.00'}
                            </span>
                        </div>
                    </div>

                    {/* Video Container */}
                    <div className="flex-1 relative bg-obsidian flex items-center justify-center">
                        {isStreamer ? (
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-contain"
                            />
                        )}

                        {stream?.status !== 'live' && !isStreamer && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                                <div className="text-center">
                                    <Video className="w-16 h-16 text-gold/30 mx-auto mb-4" />
                                    <p className="text-white/70">Stream is offline</p>
                                </div>
                            </div>
                        )}

                        {/* Streamer Controls */}
                        {isStreamer && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                                {stream?.status !== 'live' ? (
                                    <button
                                        onClick={startStream}
                                        className="gold-btn px-8 py-3 flex items-center gap-2"
                                        data-testid="start-stream-btn"
                                    >
                                        <Video className="w-5 h-5" />
                                        Go Live
                                    </button>
                                ) : (
                                    <button
                                        onClick={endStream}
                                        className="px-8 py-3 bg-red-500 text-white font-bold flex items-center gap-2"
                                        data-testid="end-stream-btn"
                                    >
                                        <VideoOff className="w-5 h-5" />
                                        End Stream
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Sidebar */}
                <div className="w-80 border-l border-white/10 flex flex-col">
                    <div className="p-4 border-b border-white/10">
                        <h2 className="font-heading text-lg text-white">Live Chat</h2>
                    </div>

                    {/* Messages */}
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.map((msg) => (
                            <div 
                                key={msg.id} 
                                className={`${msg.tip_amount ? 'bg-gold/20 border border-gold/30 p-3 rounded' : ''}`}
                            >
                                <div className="flex items-start gap-2">
                                    <span className="text-gold text-sm font-medium">{msg.username}</span>
                                    {msg.tip_amount && (
                                        <span className="px-2 py-0.5 bg-gold text-black text-xs font-bold rounded">
                                            ${msg.tip_amount}
                                        </span>
                                    )}
                                </div>
                                <p className="text-white/80 text-sm mt-1">{msg.message}</p>
                            </div>
                        ))}
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 border-t border-white/10">
                        {!isStreamer && (
                            <button
                                onClick={() => setShowTipModal(true)}
                                className="w-full gold-btn py-2 mb-3 flex items-center justify-center gap-2"
                                data-testid="tip-streamer-btn"
                            >
                                <DollarSign className="w-4 h-4" />
                                Send Tip
                            </button>
                        )}
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="Send a message..."
                                className="input-luxury flex-1 py-2 text-sm"
                                data-testid="chat-input"
                            />
                            <button
                                onClick={sendMessage}
                                className="p-2 bg-gold text-black"
                                data-testid="send-chat-btn"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tip Modal */}
                {showTipModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                        <div className="bg-obsidian border border-white/10 p-6 rounded-lg max-w-sm w-full mx-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-heading text-lg gold-text">Send a Tip</h3>
                                <button onClick={() => setShowTipModal(false)} className="text-white/50 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {[5, 10, 20, 50, 100].map((amount) => (
                                    <button
                                        key={amount}
                                        onClick={() => setTipAmount(amount)}
                                        className={`px-4 py-2 ${tipAmount === amount ? 'gold-btn' : 'btn-secondary'}`}
                                    >
                                        ${amount}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={sendTip}
                                className="gold-btn w-full py-3"
                                data-testid="confirm-stream-tip-btn"
                            >
                                Send ${tipAmount} Tip
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default LiveStreamPage;
