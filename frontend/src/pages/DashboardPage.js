import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { StoriesBar } from '../components/StoriesBar';
import { ReactionButton } from '../components/ReactionButton';
import { Crown, MessageSquare, Users, TrendingUp, Plus, Settings, Loader2, Radio, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { mediaUrl } from '../lib/media';

export const DashboardPage = () => {
    const { user, isCreator, creatorProfile, api } = useAuth();
    const [subscriptions, setSubscriptions] = useState([]);
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [subsRes, feedRes] = await Promise.all([
                api().get('/subscriptions/my'),
                api().get('/content/feed')
            ]);
            setSubscriptions(subsRes.data);
            setFeed(feedRes.data);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async (contentId) => {
        try {
            const response = await api().post(`/content/${contentId}/like`);
            setFeed(prev => prev.map(item => 
                item.id === contentId 
                    ? { ...item, is_liked: response.data.liked, like_count: item.like_count + (response.data.liked ? 1 : -1) }
                    : item
            ));
        } catch (error) {
            toast.error('Failed to like content');
        }
    };

    const handleReaction = async (contentId, reactionType) => {
        try {
            const response = await api().post(`/content/${contentId}/react?reaction_type=${reactionType || ''}`);
            setFeed(prev => prev.map(item => 
                item.id === contentId 
                    ? { 
                        ...item, 
                        user_reaction: response.data.reaction,
                        like_count: response.data.total_count,
                        reaction_counts: response.data.reaction_counts || item.reaction_counts
                    }
                    : item
            ));
        } catch (error) {
            toast.error('Failed to react');
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
        <div className="min-h-screen bg-black" data-testid="dashboard-page">
            <Navbar />
            
            <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="font-heading text-3xl md:text-4xl mb-2">
                        <span className="text-white">Welcome back,</span>
                        <span className="gold-text ml-3">{user?.display_name || user?.username || 'User'}</span>
                    </h1>
                    <p className="text-white/50">Your exclusive dashboard awaits</p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Feed */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Stories Bar */}
                        <StoriesBar />
                        
                        <div className="flex items-center justify-between">
                            <h2 className="font-heading text-xl text-white">Your Feed</h2>
                            <Link to="/explore" className="text-gold text-sm hover:text-gold-light transition-colors">
                                Discover More
                            </Link>
                        </div>

                        {feed.length === 0 ? (
                            <div className="card-luxury p-12 text-center">
                                <Crown className="w-12 h-12 text-gold/30 mx-auto mb-4" />
                                <h3 className="font-heading text-lg text-white mb-2">No Content Yet</h3>
                                <p className="text-white/50 mb-6">Subscribe to creators to see their content here</p>
                                <Link to="/explore" className="gold-btn px-6 py-3 inline-block">
                                    Explore Creators
                                </Link>
                            </div>
                        ) : (
                            feed.map((item) => (
                                <div key={item.id} className="card-luxury p-6" data-testid={`feed-item-${item.id}`}>
                                    <Link to={`/creator/${item.creator_id}`} className="flex items-center gap-4 mb-4 group">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center overflow-hidden">
                                                {item.creator_profile_image ? (
                                                    <img src={mediaUrl(item.creator_profile_image)} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Crown className="w-6 h-6 text-gold" />
                                                )}
                                            </div>
                                            {/* Online status indicator */}
                                            {item.creator_online_status === 'online' && (
                                                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-black" title="Online" />
                                            )}
                                            {item.creator_online_status === 'away' && (
                                                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-yellow-500 rounded-full border-2 border-black" title="Away" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-white font-medium group-hover:text-gold transition-colors">{item.creator_display_name || 'Creator'}</h3>
                                            <p className="text-white/40 text-sm">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </Link>

                                    {item.title && (
                                        <h4 className="font-heading text-lg text-white mb-2">{item.title}</h4>
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

                                    <div className="flex items-center gap-6 pt-4 border-t border-white/10">
                                        <ReactionButton
                                            contentId={item.id}
                                            currentReaction={item.user_reaction}
                                            reactionCounts={item.reaction_counts || {}}
                                            totalCount={item.like_count}
                                            onReact={handleReaction}
                                        />
                                        <button className="flex items-center gap-2 text-white/50 hover:text-gold transition-colors">
                                            <MessageSquare className="w-5 h-5" />
                                            <span>{item.comment_count}</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Quick Stats */}
                        <div className="card-luxury p-6">
                            <h3 className="font-heading text-lg text-white mb-4">Quick Stats</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-white/50 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-gold" />
                                        Subscriptions
                                    </span>
                                    <span className="text-white font-medium">{subscriptions.length}</span>
                                </div>
                                {isCreator && creatorProfile && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <span className="text-white/50 flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4 text-gold" />
                                                Subscribers
                                            </span>
                                            <span className="text-white font-medium">{creatorProfile.subscriber_count}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-white/50 flex items-center gap-2">
                                                <Crown className="w-4 h-4 text-gold" />
                                                Earnings
                                            </span>
                                            <span className="gold-text font-medium">${creatorProfile.total_earnings?.toFixed(2)}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Subscriptions */}
                        <div className="card-luxury p-6">
                            <h3 className="font-heading text-lg text-white mb-4">Your Subscriptions</h3>
                            {subscriptions.length === 0 ? (
                                <p className="text-white/50 text-sm">No subscriptions yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {subscriptions.slice(0, 5).map((sub) => (
                                        <div key={sub.id} className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center overflow-hidden">
                                                {sub.creator_profile_image ? (
                                                    <img src={mediaUrl(sub.creator_profile_image)} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Crown className="w-5 h-5 text-gold" />
                                                )}
                                            </div>
                                            <span className="text-white text-sm">{sub.creator_display_name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <Link
                                to="/live"
                                className="w-full py-4 flex items-center justify-center gap-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
                                data-testid="watch-live-btn"
                            >
                                <Radio className="w-5 h-5" />
                                Watch Live
                            </Link>
                            <Link
                                to="/ppv"
                                className="w-full py-4 flex items-center justify-center gap-2 border border-gold/50 text-gold hover:bg-gold/10 transition-colors"
                                data-testid="ppv-inbox-btn"
                            >
                                <Lock className="w-5 h-5" />
                                PPV Inbox
                            </Link>
                            {!isCreator ? (
                                <Link
                                    to="/become-creator"
                                    className="gold-btn w-full py-4 flex items-center justify-center gap-2"
                                    data-testid="become-creator-btn"
                                >
                                    <Crown className="w-5 h-5" />
                                    Become a Creator
                                </Link>
                            ) : (
                                <Link
                                    to="/creator/dashboard"
                                    className="gold-btn w-full py-4 flex items-center justify-center gap-2"
                                    data-testid="creator-studio-btn"
                                >
                                    <Crown className="w-5 h-5" />
                                    Creator Studio
                                </Link>
                            )}
                            <Link
                                to="/settings"
                                className="btn-secondary w-full py-4 flex items-center justify-center gap-2"
                                data-testid="settings-btn"
                            >
                                <Settings className="w-5 h-5" />
                                Account Settings
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DashboardPage;
