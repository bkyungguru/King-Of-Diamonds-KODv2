import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { Video, VideoOff, Mic, MicOff, Users, DollarSign, Send, X, Radio, Crown, Loader2, PhoneOff, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import SimplePeer from 'simple-peer';

import { mediaUrl } from '../lib/media';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const WS_BASE = BACKEND_URL.replace(/^http/, 'ws');

// ICE servers for NAT traversal
// STUN: free Google servers
// TURN: self-hosted coturn on JOHNNY5
const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
        urls: 'turn:108.215.29.236:3478',
        username: 'kodturn',
        credential: 'KodTurn2026!',
    },
    {
        urls: 'turn:108.215.29.236:3478?transport=tcp',
        username: 'kodturn',
        credential: 'KodTurn2026!',
    },
];

export const LiveStreamPage = () => {
    const { streamId } = useParams();
    const navigate = useNavigate();
    const { user, api, token } = useAuth();
    const [stream, setStream] = useState(null);
    const [isStreamer, setIsStreamer] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [viewerCount, setViewerCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [tipAmount, setTipAmount] = useState(5);
    const [showTipModal, setShowTipModal] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [connected, setConnected] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('connecting');

    // Refs
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const chatContainerRef = useRef(null);
    const wsRef = useRef(null);
    const peersRef = useRef({});
    const peerRef = useRef(null);
    const chatPollRef = useRef(null);
    const lastChatIdRef = useRef(null);
    const wsReconnectRef = useRef(null);
    const isStreamerRef = useRef(false);

    // Poll chat via REST as fallback (always active)
    const startChatPolling = useCallback(() => {
        if (chatPollRef.current) return;
        chatPollRef.current = setInterval(async () => {
            try {
                const response = await api().get(`/livestream/${streamId}/chat`);
                if (response.data && Array.isArray(response.data)) {
                    setMessages(response.data);
                }
                // Also poll stream status (viewers only — broadcaster controls their own state)
                if (!isStreamerRef.current) {
                    const streamRes = await api().get(`/livestream/${streamId}`).catch(() => null);
                    if (streamRes?.data) {
                        setViewerCount(streamRes.data.viewer_count || 0);
                        if (streamRes.data.status === 'ended') {
                            setIsLive(false);
                            toast.info('Stream has ended');
                        }
                    }
                }
            } catch (e) {}
        }, 3000);
    }, [streamId, api]);

    const stopChatPolling = useCallback(() => {
        if (chatPollRef.current) {
            clearInterval(chatPollRef.current);
            chatPollRef.current = null;
        }
    }, []);

    // Connect WebSocket with reconnection
    const connectWS = useCallback((role) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const authToken = token || localStorage.getItem('kod_token');
        if (!authToken) return;

        const wsUrl = `${WS_BASE}/ws/stream/${streamId}?token=${authToken}&role=${role}`;

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;
            setConnectionStatus('connecting');

            ws.onopen = () => {
                console.log(`WebSocket connected as ${role}`);
                setWsConnected(true);
                setConnectionStatus('connected');
            };

            ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                handleSignalingMessage(msg, role);
            };

            ws.onclose = () => {
                console.log('WebSocket closed');
                setWsConnected(false);
                setConnectionStatus('disconnected');
                wsRef.current = null;

                // Reconnect after 5s
                wsReconnectRef.current = setTimeout(() => {
                    if (document.visibilityState !== 'hidden') {
                        connectWS(role);
                    }
                }, 5000);
            };

            ws.onerror = (err) => {
                console.error('WebSocket error:', err);
                setConnectionStatus('error');
            };
        } catch (e) {
            console.error('WebSocket connection failed:', e);
            setConnectionStatus('error');
        }
    }, [streamId, token]);

    // Handle signaling messages
    const handleSignalingMessage = useCallback((msg, role) => {
        switch (msg.type) {
            case 'viewer-count':
                setViewerCount(msg.count);
                break;

            case 'broadcaster-ready':
                if (role === 'viewer') {
                    createViewerPeer();
                }
                break;

            case 'offer':
                if (role === 'broadcaster' && localStreamRef.current) {
                    createBroadcasterPeer(msg.viewer_id, msg.offer);
                }
                break;

            case 'answer':
                if (peerRef.current && !peerRef.current.destroyed) {
                    peerRef.current.signal(msg.answer);
                }
                break;

            case 'ice-candidate':
                if (role === 'broadcaster') {
                    const peer = peersRef.current[msg.viewer_id];
                    if (peer && !peer.destroyed) {
                        peer.signal({ candidate: msg.candidate });
                    }
                } else {
                    if (peerRef.current && !peerRef.current.destroyed) {
                        peerRef.current.signal({ candidate: msg.candidate });
                    }
                }
                break;

            case 'chat':
                setMessages(prev => [...prev.slice(-99), {
                    id: Date.now().toString(),
                    username: msg.username,
                    message: msg.message,
                    tip_amount: msg.tip_amount,
                    user_id: msg.user_id,
                }]);
                break;

            case 'stream-ended':
                toast.info('Stream has ended');
                cleanupPeers();
                setIsLive(false);
                break;

            default:
                break;
        }
    }, []);

    // Viewer: create initiator peer with TURN servers
    const createViewerPeer = useCallback(() => {
        if (peerRef.current) {
            peerRef.current.destroy();
        }

        const peer = new SimplePeer({
            initiator: true,
            trickle: true,
            config: { iceServers: ICE_SERVERS },
        });

        peer.on('signal', (data) => {
            if (data.type === 'offer') {
                wsRef.current?.send(JSON.stringify({ type: 'offer', offer: data }));
            } else if (data.candidate) {
                wsRef.current?.send(JSON.stringify({ type: 'ice-candidate', candidate: data.candidate }));
            }
        });

        peer.on('stream', (remoteStream) => {
            console.log('Received remote stream');
            setConnected(true);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
        });

        peer.on('error', (err) => {
            console.error('Peer error:', err);
            setConnected(false);
        });

        peer.on('close', () => {
            console.log('Peer closed');
            setConnected(false);
        });

        peerRef.current = peer;
    }, []);

    // Broadcaster: create answering peer for a viewer with TURN servers
    const createBroadcasterPeer = useCallback((viewerId, offer) => {
        if (peersRef.current[viewerId]) {
            peersRef.current[viewerId].destroy();
        }

        const peer = new SimplePeer({
            initiator: false,
            trickle: true,
            stream: localStreamRef.current,
            config: { iceServers: ICE_SERVERS },
        });

        peer.on('signal', (data) => {
            if (data.type === 'answer') {
                wsRef.current?.send(JSON.stringify({
                    type: 'answer',
                    answer: data,
                    viewer_id: viewerId,
                }));
            } else if (data.candidate) {
                wsRef.current?.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: data.candidate,
                    viewer_id: viewerId,
                }));
            }
        });

        peer.on('error', (err) => {
            console.error(`Peer error for viewer ${viewerId}:`, err);
        });

        peer.on('close', () => {
            delete peersRef.current[viewerId];
        });

        peer.signal(offer);
        peersRef.current[viewerId] = peer;
    }, []);

    const cleanupPeers = useCallback(() => {
        Object.values(peersRef.current).forEach(p => p.destroy());
        peersRef.current = {};
        if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
        }
    }, []);

    // Fetch stream info
    useEffect(() => {
        if (!streamId) return;

        const init = async () => {
            try {
                const response = await api().get(`/livestream/${streamId}`);
                setStream(response.data);
                setViewerCount(response.data.viewer_count);
                setIsLive(response.data.status === 'live');

                const creatorRes = await api().get('/creators/me').catch(() => null);
                if (creatorRes?.data?.id === response.data.creator_id) {
                    setIsStreamer(true);
                    isStreamerRef.current = true;
                    connectWS('broadcaster');
                    // Start camera preview immediately so streamer can see themselves
                    try {
                        const previewStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                        localStreamRef.current = previewStream;
                        // Try setting immediately, and retry after DOM paints
                        const setVideo = () => {
                            if (localVideoRef.current && localStreamRef.current) {
                                localVideoRef.current.srcObject = localStreamRef.current;
                                localVideoRef.current.play().catch(() => {});
                            }
                        };
                        setVideo();
                        setTimeout(setVideo, 500);
                        setTimeout(setVideo, 1500);
                    } catch (e) {
                        console.error('Camera preview failed:', e);
                        toast.error('Could not access camera. Please allow camera permissions.');
                    }
                } else {
                    await api().post(`/livestream/${streamId}/join`).catch(() => {});
                    connectWS('viewer');
                }

                // Always start REST chat polling as fallback
                startChatPolling();
            } catch (error) {
                toast.error('Stream not found');
                navigate('/live');
            } finally {
                setLoading(false);
            }
        };

        init();

        return () => {
            cleanupPeers();
            stopChatPolling();
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            if (wsReconnectRef.current) {
                clearTimeout(wsReconnectRef.current);
            }
        };
    }, [streamId]);

    // Ensure video element gets the stream when both are ready
    useEffect(() => {
        if (isStreamer && localStreamRef.current && localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
        }
    }, [isStreamer, isLive, loading]);

    // Auto-scroll chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Fetch existing chat on load
    useEffect(() => {
        if (!streamId) return;
        const fetchChat = async () => {
            try {
                const response = await api().get(`/livestream/${streamId}/chat`);
                setMessages(response.data);
            } catch (e) {}
        };
        fetchChat();
    }, [streamId]);

    // Start streaming (broadcaster)
    const startStream = async () => {
        try {
            // Reuse existing preview stream or start new one
            if (!localStreamRef.current) {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                localStreamRef.current = mediaStream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = mediaStream;
                }
            }

            await api().post(`/livestream/${streamId}/start`);
            setIsLive(true);
            setStream(prev => ({ ...prev, status: 'live' }));
            toast.success('You are now LIVE!');
        } catch (error) {
            toast.error('Failed to start stream: ' + error.message);
        }
    };

    const endStream = async () => {
        try {
            wsRef.current?.send(JSON.stringify({ type: 'end-stream' }));
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
                localStreamRef.current = null;
            }
            cleanupPeers();
            await api().post(`/livestream/${streamId}/end`);
            toast.success('Stream ended');
            navigate('/creator/dashboard');
        } catch (error) {
            toast.error('Failed to end stream');
        }
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    // Send chat — try WebSocket first, fall back to REST
    const sendMessage = async () => {
        if (!newMessage.trim()) return;

        const chatMsg = {
            username: user?.display_name || user?.username || 'User',
            message: newMessage,
        };

        // Try WebSocket
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'chat', ...chatMsg }));
        }

        // Always persist to REST (ensures it works even if WS is down)
        try {
            await api().post(`/livestream/${streamId}/chat?message=${encodeURIComponent(newMessage)}`);
        } catch (e) {
            console.error('Failed to send chat:', e);
        }

        setNewMessage('');
    };

    const sendTip = async () => {
        try {
            await api().post(`/livestream/${streamId}/tip?amount=${tipAmount}`);

            const tipMsg = `Sent a $${tipAmount.toFixed(2)} tip! 💰`;
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: 'chat',
                    username: user?.display_name || user?.username || 'User',
                    message: tipMsg,
                    tip_amount: tipAmount,
                }));
            }

            toast.success(`Sent $${tipAmount} tip!`);
            setShowTipModal(false);
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

            <main className="pt-16 h-screen flex flex-col lg:flex-row">
                {/* Video Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Stream Header */}
                    <div className="p-3 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 border border-gold/30">
                                <AvatarImage src={mediaUrl(stream?.creator_profile_image)} />
                                <AvatarFallback className="bg-obsidian text-gold text-xs">
                                    {stream?.creator_display_name?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h1 className="text-white font-medium text-sm">{stream?.title}</h1>
                                <p className="text-white/50 text-xs">{stream?.creator_display_name}</p>
                            </div>
                            {isLive && (
                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                                    <Radio className="w-2.5 h-2.5" />
                                    LIVE
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <span className="flex items-center gap-1.5 text-white/70">
                                <Users className="w-3.5 h-3.5" />
                                {viewerCount}
                            </span>
                            <span className="flex items-center gap-1.5 text-gold">
                                <DollarSign className="w-3.5 h-3.5" />
                                ${stream?.total_tips?.toFixed(2) || '0.00'}
                            </span>
                            <span className={`w-2 h-2 rounded-full ${
                                connectionStatus === 'connected' ? 'bg-green-500' :
                                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                                'bg-red-500'
                            }`} title={`Connection: ${connectionStatus}`} />
                        </div>
                    </div>

                    {/* Video Container */}
                    <div className="flex-1 relative bg-obsidian flex items-center justify-center overflow-hidden">
                        {isStreamer ? (
                            /* BROADCASTER VIEW */
                            <div className="w-full h-full flex flex-col items-center justify-center p-6">
                                {isLive && (
                                    <>
                                        <div className="relative w-96 h-72 lg:w-[480px] lg:h-[360px] rounded-xl overflow-hidden border-2 border-gold/40 shadow-lg mb-6">
                                            <video
                                                ref={localVideoRef}
                                                autoPlay
                                                muted
                                                playsInline
                                                className="w-full h-full object-cover"
                                            />
                                            <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                                                <Radio className="w-2.5 h-2.5" /> LIVE
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-6 mb-8">
                                            <div className="text-center">
                                                <div className="flex items-center justify-center gap-2 text-white/50 text-sm mb-1">
                                                    <Users className="w-4 h-4" /> Viewers
                                                </div>
                                                <p className="text-3xl font-bold text-white">{viewerCount}</p>
                                            </div>
                                            <div className="text-center">
                                                <div className="flex items-center justify-center gap-2 text-white/50 text-sm mb-1">
                                                    <DollarSign className="w-4 h-4" /> Tips
                                                </div>
                                                <p className="text-3xl font-bold text-gold">${stream?.total_tips?.toFixed(2) || '0.00'}</p>
                                            </div>
                                            <div className="text-center">
                                                <div className="flex items-center justify-center gap-2 text-white/50 text-sm mb-1">
                                                    <MessageSquare className="w-4 h-4" /> Chat
                                                </div>
                                                <p className="text-3xl font-bold text-white">{messages.length}</p>
                                            </div>
                                        </div>

                                        <p className="text-white/40 text-sm mb-6">{stream?.title}</p>

                                        <div className="flex items-center gap-3 bg-black/50 backdrop-blur-sm px-6 py-3 rounded-full border border-white/10">
                                            <button
                                                onClick={toggleMute}
                                                className={`p-3 rounded-full transition-colors ${isMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                                                title={isMuted ? 'Unmute' : 'Mute'}
                                            >
                                                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                            </button>
                                            <button
                                                onClick={toggleVideo}
                                                className={`p-3 rounded-full transition-colors ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                                                title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                                            >
                                                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                                            </button>
                                            <button
                                                onClick={endStream}
                                                className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                                                data-testid="end-stream-btn"
                                                title="End Stream"
                                            >
                                                <PhoneOff className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </>
                                )}
                                {!isLive && (
                                    <>
                                        <video
                                            ref={localVideoRef}
                                            autoPlay
                                            muted
                                            playsInline
                                            className="w-96 h-72 lg:w-[480px] lg:h-[360px] rounded-xl object-cover border-2 border-white/10 mb-6"
                                        />
                                        <Video className="w-12 h-12 text-gold/50 mb-4" />
                                        <p className="text-white/70 mb-6">Ready to go live?</p>
                                        <button
                                            onClick={startStream}
                                            className="gold-btn px-10 py-4 text-lg flex items-center gap-3"
                                            data-testid="start-stream-btn"
                                        >
                                            <Radio className="w-6 h-6" />
                                            Go Live
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : (
                            /* VIEWER VIEW */
                            <div className="w-full h-full flex items-center justify-center p-4">
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    className="max-w-full max-h-full rounded-lg object-contain"
                                    style={{ maxHeight: 'calc(100vh - 200px)' }}
                                />

                                {!isLive && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                                        <div className="text-center">
                                            <Video className="w-16 h-16 text-gold/30 mx-auto mb-4" />
                                            <p className="text-white/70 text-lg">Stream is offline</p>
                                            <p className="text-white/40 text-sm mt-2">Waiting for the creator to go live...</p>
                                        </div>
                                    </div>
                                )}

                                {isLive && !connected && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                        <div className="text-center">
                                            <Loader2 className="w-10 h-10 text-gold animate-spin mx-auto mb-4" />
                                            <p className="text-white/70">Connecting to stream...</p>
                                            <p className="text-white/40 text-xs mt-2">
                                                {connectionStatus === 'error' ? 'Connection issue — chat still works via polling' : 'Establishing peer connection...'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Sidebar */}
                <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col h-64 lg:h-auto">
                    <div className="p-3 border-b border-white/10 flex items-center justify-between">
                        <h2 className="font-heading text-base text-white">Live Chat</h2>
                        <span className="text-white/40 text-xs">{messages.length}</span>
                    </div>

                    {/* Messages */}
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                        {messages.length === 0 && (
                            <p className="text-white/30 text-sm text-center py-8">No messages yet. Say hi! 👋</p>
                        )}
                        {messages.map((msg, i) => (
                            <div
                                key={msg.id || msg._id || i}
                                className={`${msg.tip_amount ? 'bg-gold/20 border border-gold/30 p-2 rounded-lg' : ''}`}
                            >
                                <div className="flex items-start gap-2">
                                    <span className="text-gold text-sm font-medium shrink-0">{msg.username}</span>
                                    {msg.tip_amount && (
                                        <span className="px-1.5 py-0.5 bg-gold text-black text-xs font-bold rounded">
                                            ${msg.tip_amount}
                                        </span>
                                    )}
                                </div>
                                <p className="text-white/80 text-sm mt-0.5">{msg.message}</p>
                            </div>
                        ))}
                    </div>

                    {/* Chat Input */}
                    <div className="p-3 border-t border-white/10">
                        {!isStreamer && (
                            <button
                                onClick={() => setShowTipModal(true)}
                                className="w-full gold-btn py-2 mb-2 flex items-center justify-center gap-2 text-sm"
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
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="Send a message..."
                                className="input-luxury flex-1 py-2 text-sm"
                                data-testid="chat-input"
                            />
                            <button
                                onClick={sendMessage}
                                className="p-2 bg-gold text-black rounded"
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
                                        className={`px-4 py-2 rounded ${tipAmount === amount ? 'gold-btn' : 'btn-secondary'}`}
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
