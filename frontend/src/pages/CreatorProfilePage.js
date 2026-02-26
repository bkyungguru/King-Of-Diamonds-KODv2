import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { Crown, Users, Heart, MessageSquare, Lock, CheckCircle, Loader2, DollarSign, Edit2, Trash2, RefreshCw, Globe, X, Radio } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import { mediaUrl } from '../lib/media';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const CreatorProfilePage = () => {
    const { creatorId } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, user, api, creatorProfile } = useAuth();
    const [creator, setCreator] = useState(null);
    const [content, setContent] = useState([]);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState(false);
    const [tipDialogOpen, setTipDialogOpen] = useState(false);
    const [tipAmount, setTipAmount] = useState(5);
    const [tipMessage, setTipMessage] = useState('');
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingContent, setEditingContent] = useState(null);
    const [liveStream, setLiveStream] = useState(null);
    
    // Check if this is the creator viewing their own page
    const isOwnPage = creatorProfile?.id === creatorId;

    useEffect(() => {
        fetchCreatorData();
    }, [creatorId]);

    const fetchCreatorData = async () => {
        try {
            const creatorRes = await axios.get(`${API}/creators/${creatorId}`);
            setCreator(creatorRes.data);

            // Get content - public if not logged in
            const contentRes = await axios.get(`${API}/content/creator/${creatorId}`);
            setContent(contentRes.data);

            // Check if creator is currently live
            try {
                const liveRes = await axios.get(`${API}/livestream/live`);
                const creatorStream = liveRes.data.find(s => s.creator_id === creatorId);
                setLiveStream(creatorStream || null);
            } catch (e) {}

            // Check subscription status if logged in
            if (isAuthenticated) {
                try {
                    const subRes = await api().get(`/subscriptions/check/${creatorId}`);
                    setIsSubscribed(subRes.data.is_subscribed);
                } catch (e) {
                    // Not subscribed
                }
            }
        } catch (error) {
            console.error('Failed to fetch creator:', error);
            toast.error('Creator not found');
            navigate('/explore');
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async () => {
        if (!isAuthenticated) {
            toast.error('Please login to subscribe');
            navigate('/login');
            return;
        }

        setSubscribing(true);
        try {
            await api().post('/subscriptions/subscribe', { creator_id: creatorId });
            setIsSubscribed(true);
            toast.success('Subscribed successfully!');
            fetchCreatorData(); // Refresh content
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to subscribe');
        } finally {
            setSubscribing(false);
        }
    };

    const handleUnsubscribe = async () => {
        try {
            await api().delete(`/subscriptions/unsubscribe/${creatorId}`);
            setIsSubscribed(false);
            toast.success('Unsubscribed');
            fetchCreatorData();
        } catch (error) {
            toast.error('Failed to unsubscribe');
        }
    };

    const handleSendTip = async () => {
        if (!isAuthenticated) {
            toast.error('Please login to send tips');
            return;
        }

        try {
            await api().post('/tips/send', {
                creator_id: creatorId,
                amount: tipAmount,
                message: tipMessage || null
            });
            toast.success(`Tip of $${tipAmount} sent!`);
            setTipDialogOpen(false);
            setTipAmount(5);
            setTipMessage('');
        } catch (error) {
            toast.error('Failed to send tip');
        }
    };

    // Content management functions (for creator viewing own page)
    const handleEditContent = (item) => {
        setEditingContent({
            id: item.id,
            title: item.title || '',
            text: item.text || '',
            visibility: item.visibility || (item.is_public ? 'public' : 'subscribers')
        });
        setEditDialogOpen(true);
    };

    const handleUpdateContent = async () => {
        if (!editingContent) return;
        try {
            await api().put(`/content/${editingContent.id}`, {
                title: editingContent.title || null,
                text: editingContent.text || null,
                visibility: editingContent.visibility
            });
            toast.success('Content updated!');
            setEditDialogOpen(false);
            setEditingContent(null);
            fetchCreatorData();
        } catch (error) {
            toast.error('Failed to update content');
        }
    };

    const handleDeleteContent = async (contentId) => {
        if (!window.confirm('Are you sure you want to delete this post?')) return;
        try {
            await api().delete(`/content/${contentId}`);
            toast.success('Content deleted');
            setContent(prev => prev.filter(c => c.id !== contentId));
        } catch (error) {
            toast.error('Failed to delete content');
        }
    };

    const handleRepost = async (item) => {
        try {
            await api().post('/content/', {
                title: item.title ? `Repost: ${item.title}` : null,
                text: item.text,
                media_urls: item.media_urls || [],
                media_type: item.media_type,
                visibility: 'subscribers'
            });
            toast.success('Content reposted!');
            fetchCreatorData();
        } catch (error) {
            toast.error('Failed to repost');
        }
    };

    const handleLike = async (contentId) => {
        if (!isAuthenticated) {
            toast.error('Please login to like content');
            return;
        }

        try {
            const response = await api().post(`/content/${contentId}/like`);
            setContent(prev => prev.map(item =>
                item.id === contentId
                    ? { ...item, is_liked: response.data.liked, like_count: item.like_count + (response.data.liked ? 1 : -1) }
                    : item
            ));
        } catch (error) {
            toast.error('Failed to like content');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
            </div>
        );
    }

    if (!creator) return null;

    return (
        <div className="min-h-screen bg-black" data-testid="creator-profile-page">
            <Navbar />

            {/* Cover Image */}
            <div className="h-64 md:h-80 relative">
                {creator.cover_image_url ? (
                    <img
                        src={mediaUrl(creator.cover_image_url)}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gold/20 via-black to-black" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
            </div>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10 pb-12">
                {/* Profile Header */}
                <div className="flex flex-col md:flex-row gap-6 mb-10">
                    {/* Profile Image */}
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-black overflow-hidden bg-obsidian flex-shrink-0">
                        {creator.profile_image_url ? (
                            <img
                                src={mediaUrl(creator.profile_image_url)}
                                alt={creator.display_name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gold/20">
                                <Crown className="w-16 h-16 text-gold" />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-3">
                                <h1 className="font-heading text-3xl text-white">{creator.display_name}</h1>
                                {liveStream && (
                                    <button
                                        onClick={() => navigate(`/live/${liveStream.id}`)}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse hover:bg-red-600 transition-colors"
                                    >
                                        <Radio className="w-3 h-3" />
                                        LIVE
                                    </button>
                                )}
                            </div>
                            {creator.is_verified && (
                                <CheckCircle className="w-6 h-6 text-gold" />
                            )}
                            {/* Online Status Indicator */}
                            {creator.online_status && (
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                    creator.online_status === 'online' 
                                        ? 'bg-green-500/20 text-green-400' 
                                        : creator.online_status === 'away'
                                        ? 'bg-yellow-500/20 text-yellow-400'
                                        : 'bg-white/10 text-white/50'
                                }`} data-testid="creator-status">
                                    {creator.online_status === 'online' ? '● Online' : creator.online_status === 'away' ? '● Away' : '○ Offline'}
                                </span>
                            )}
                        </div>
                        <p className="text-white/50 mb-4 flex items-center gap-4">
                            <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {creator.subscriber_count} subscribers
                            </span>
                            <span className="gold-text font-medium">${creator.subscription_price}/month</span>
                        </p>
                        {creator.bio && (
                            <p className="text-white/70 mb-6 max-w-2xl">{creator.bio}</p>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-4">
                            {isSubscribed ? (
                                <>
                                    <button
                                        onClick={handleUnsubscribe}
                                        className="btn-secondary px-6 py-3"
                                        data-testid="unsubscribe-btn"
                                    >
                                        Subscribed
                                    </button>
                                    <button
                                        onClick={() => navigate(`/messages?to=${creator.user_id}`)}
                                        className="btn-secondary px-6 py-3 flex items-center gap-2"
                                        data-testid="message-btn"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        Message
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleSubscribe}
                                    disabled={subscribing}
                                    className="gold-btn px-8 py-3 flex items-center gap-2"
                                    data-testid="subscribe-btn"
                                >
                                    {subscribing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Crown className="w-4 h-4" />
                                    )}
                                    Subscribe ${creator.subscription_price}/mo
                                </button>
                            )}
                            <button
                                onClick={() => setTipDialogOpen(true)}
                                className="btn-secondary px-6 py-3 flex items-center gap-2"
                                data-testid="tip-btn"
                            >
                                <DollarSign className="w-4 h-4" />
                                Send Tip
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="space-y-6">
                    <h2 className="font-heading text-xl text-white">Content</h2>

                    {content.length === 0 ? (
                        <div className="card-luxury p-12 text-center">
                            <Crown className="w-12 h-12 text-gold/30 mx-auto mb-4" />
                            <p className="text-white/50">No content yet</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-6">
                            {content.map((item) => (
                                <div key={item.id} className="card-luxury p-6" data-testid={`content-${item.id}`}>
                                    {!item.is_public && !isSubscribed ? (
                                        <div className="aspect-video bg-obsidian flex flex-col items-center justify-center rounded-sm mb-4">
                                            <Lock className="w-10 h-10 text-gold/50 mb-3" />
                                            <p className="text-white/50 text-sm">Subscribe to unlock</p>
                                        </div>
                                    ) : (
                                        <>
                                            {item.title && (
                                                <h3 className="font-heading text-lg text-white mb-2">{item.title}</h3>
                                            )}
                                            {item.text && (
                                                <p className="text-white/70 mb-4">{item.text}</p>
                                            )}
                                            {item.media_urls?.length > 0 && (
                                                <div className="rounded-sm overflow-hidden mb-4">
                                                    {item.media_type === 'video' ? (
                                                        <video 
                                                            src={mediaUrl(item.media_urls[0])} 
                                                            className="w-full h-auto max-h-96 object-contain bg-black"
                                                            controls
                                                        />
                                                    ) : (
                                                        <img
                                                            src={mediaUrl(item.media_urls[0])}
                                                            alt=""
                                                            className="w-full h-auto max-h-96 object-contain"
                                                        />
                                                    )}
                                                    {item.media_urls.length > 1 && (
                                                        <div className="flex gap-2 mt-2 overflow-x-auto">
                                                            {item.media_urls.slice(1).map((url, idx) => (
                                                                <img 
                                                                    key={idx}
                                                                    src={url} 
                                                                    alt="" 
                                                                    className="w-20 h-20 object-cover rounded flex-shrink-0"
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => handleLike(item.id)}
                                                className={`flex items-center gap-2 transition-colors ${item.is_liked ? 'text-red-500' : 'text-white/50 hover:text-red-500'}`}
                                                data-testid={`like-${item.id}`}
                                            >
                                                <Heart className={`w-5 h-5 ${item.is_liked ? 'fill-current' : ''}`} />
                                                <span>{item.like_count}</span>
                                            </button>
                                            <span className="text-white/30 text-sm">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        
                                        {/* Creator actions on own page */}
                                        {isOwnPage && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEditContent(item)}
                                                    className="p-2 text-white/40 hover:text-gold transition-colors"
                                                    title="Edit"
                                                    data-testid={`edit-content-${item.id}`}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleRepost(item)}
                                                    className="p-2 text-white/40 hover:text-green-400 transition-colors"
                                                    title="Repost"
                                                    data-testid={`repost-content-${item.id}`}
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteContent(item.id)}
                                                    className="p-2 text-white/40 hover:text-red-500 transition-colors"
                                                    title="Delete"
                                                    data-testid={`delete-content-${item.id}`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Tip Dialog */}
            <Dialog open={tipDialogOpen} onOpenChange={setTipDialogOpen}>
                <DialogContent className="bg-obsidian border-white/10">
                    <DialogHeader>
                        <DialogTitle className="font-heading gold-text">Send a Tip</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div>
                            <label className="text-white/70 text-sm uppercase tracking-wider mb-2 block">
                                Amount (USD)
                            </label>
                            <div className="flex gap-2">
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
                        </div>
                        <div>
                            <label className="text-white/70 text-sm uppercase tracking-wider mb-2 block">
                                Message (optional)
                            </label>
                            <textarea
                                value={tipMessage}
                                onChange={(e) => setTipMessage(e.target.value)}
                                className="input-luxury w-full h-24 resize-none"
                                placeholder="Say something nice..."
                            />
                        </div>
                        <button
                            onClick={handleSendTip}
                            className="gold-btn w-full py-3"
                            data-testid="confirm-tip-btn"
                        >
                            Send ${tipAmount} Tip
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Content Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="bg-obsidian border-white/10 max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="font-heading gold-text">Edit Content</DialogTitle>
                    </DialogHeader>
                    {editingContent && (
                        <div className="space-y-4 mt-4">
                            <div>
                                <label className="text-white/70 text-sm uppercase tracking-wider mb-2 block">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={editingContent.title}
                                    onChange={(e) => setEditingContent(prev => ({ ...prev, title: e.target.value }))}
                                    className="input-luxury w-full"
                                    placeholder="Post title"
                                />
                            </div>
                            <div>
                                <label className="text-white/70 text-sm uppercase tracking-wider mb-2 block">
                                    Content
                                </label>
                                <textarea
                                    value={editingContent.text}
                                    onChange={(e) => setEditingContent(prev => ({ ...prev, text: e.target.value }))}
                                    className="input-luxury w-full h-24 resize-none"
                                    placeholder="What's on your mind?"
                                />
                            </div>
                            <div>
                                <label className="text-white/70 text-sm uppercase tracking-wider mb-2 block">
                                    Visibility
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingContent(prev => ({ ...prev, visibility: 'public' }))}
                                        className={`px-4 py-2 text-sm rounded flex items-center gap-2 ${editingContent.visibility === 'public' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-white/5 text-white/50'}`}
                                    >
                                        <Globe className="w-4 h-4" /> Public
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingContent(prev => ({ ...prev, visibility: 'subscribers' }))}
                                        className={`px-4 py-2 text-sm rounded flex items-center gap-2 ${editingContent.visibility === 'subscribers' ? 'bg-gold/20 text-gold border border-gold/50' : 'bg-white/5 text-white/50'}`}
                                    >
                                        <Lock className="w-4 h-4" /> Subscribers
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleUpdateContent}
                                className="gold-btn w-full py-3 flex items-center justify-center gap-2"
                            >
                                <Edit2 className="w-5 h-5" />
                                Update Content
                            </button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CreatorProfilePage;
