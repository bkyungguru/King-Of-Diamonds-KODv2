import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { FileUpload } from '../components/FileUpload';
import { Crown, Plus, Image, Video, FileText, Eye, EyeOff, Heart, DollarSign, Users, TrendingUp, Loader2, Trash2, Radio, Calendar, Lock, Send, Clock, Edit2, Globe, EyeOff as EyeOffIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export const CreatorDashboardPage = () => {
    const { user, creatorProfile, isCreator, api, updateCreator } = useAuth();
    const navigate = useNavigate();
    const [content, setContent] = useState([]);
    const [tips, setTips] = useState([]);
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [storyDialogOpen, setStoryDialogOpen] = useState(false);
    const [goLiveDialogOpen, setGoLiveDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingContent, setEditingContent] = useState(null);
    const [newPost, setNewPost] = useState({
        title: '',
        text: '',
        media_urls: [],
        visibility: 'subscribers'  // public, subscribers, unpublished
    });
    const [newStory, setNewStory] = useState({ media_url: '', caption: '' });
    const [newStream, setNewStream] = useState({ title: '', description: '' });
    const [onlineStatus, setOnlineStatus] = useState('offline');
    const [posting, setPosting] = useState(false);

    useEffect(() => {
        if (!isCreator) {
            navigate('/become-creator');
            return;
        }
        fetchData();
        // Set initial online status
        if (creatorProfile?.online_status) {
            setOnlineStatus(creatorProfile.online_status);
        }
    }, [isCreator, creatorProfile]);

    const fetchData = async () => {
        try {
            const [contentRes, tipsRes, storiesRes] = await Promise.all([
                api().get(`/content/creator/${creatorProfile?.id}`),
                api().get('/tips/received'),
                api().get('/stories/my').catch(() => ({ data: [] }))
            ]);
            setContent(contentRes.data);
            setTips(tipsRes.data);
            setStories(storiesRes.data);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePost = async () => {
        if (!newPost.text && newPost.media_urls.length === 0) {
            toast.error('Please add some content');
            return;
        }

        setPosting(true);
        try {
            const postData = {
                title: newPost.title || null,
                text: newPost.text || null,
                media_urls: newPost.media_urls,
                media_type: newPost.media_urls.length > 0 ? 'image' : 'text',
                is_public: newPost.visibility === 'public',
                visibility: newPost.visibility
            };
            console.log('Creating post with data:', postData);
            
            await api().post('/content/', postData);
            toast.success('Post created!');
            setCreateDialogOpen(false);
            setNewPost({ title: '', text: '', media_urls: [], visibility: 'subscribers' });
            fetchData();
        } catch (error) {
            console.error('Create post error:', error);
            console.error('Error response:', error.response?.data);
            toast.error('Failed to create post: ' + (error.response?.data?.detail || error.message));
        } finally {
            setPosting(false);
        }
    };

    const handleEditContent = (item) => {
        setEditingContent({
            id: item.id,
            title: item.title || '',
            text: item.text || '',
            media_urls: item.media_urls || [],
            visibility: item.visibility || (item.is_public ? 'public' : 'subscribers')
        });
        setEditDialogOpen(true);
    };

    const handleUpdateContent = async () => {
        if (!editingContent) return;
        
        setPosting(true);
        try {
            await api().put(`/content/${editingContent.id}`, {
                title: editingContent.title || null,
                text: editingContent.text || null,
                media_urls: editingContent.media_urls,
                visibility: editingContent.visibility
            });
            toast.success('Content updated!');
            setEditDialogOpen(false);
            setEditingContent(null);
            fetchData();
        } catch (error) {
            toast.error('Failed to update content');
        } finally {
            setPosting(false);
        }
    };

    const handleDeleteContent = async (contentId) => {
        try {
            await api().delete(`/content/${contentId}`);
            toast.success('Content deleted');
            setContent(prev => prev.filter(c => c.id !== contentId));
        } catch (error) {
            toast.error('Failed to delete content');
        }
    };

    const handleCreateStory = async () => {
        if (!newStory.media_url) {
            toast.error('Please add a media URL');
            return;
        }
        
        setPosting(true);
        try {
            await api().post('/stories/', {
                media_url: newStory.media_url,
                media_type: 'image',
                caption: newStory.caption || null
            });
            toast.success('Story posted! (24hr)');
            setStoryDialogOpen(false);
            setNewStory({ media_url: '', caption: '' });
            fetchData();
        } catch (error) {
            toast.error('Failed to create story');
        } finally {
            setPosting(false);
        }
    };

    const handleGoLive = async () => {
        if (!newStream.title) {
            toast.error('Please add a title');
            return;
        }
        
        setPosting(true);
        try {
            const response = await api().post('/livestream/create', {
                title: newStream.title,
                description: newStream.description || null
            });
            toast.success('Stream created!');
            setGoLiveDialogOpen(false);
            navigate(`/live/${response.data.id}`);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create stream');
        } finally {
            setPosting(false);
        }
    };

    const handleStatusChange = async (status) => {
        try {
            await api().put(`/creators/me/status?status=${status}`);
            setOnlineStatus(status);
            toast.success(`Status: ${status}`);
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleMediaUpload = (files) => {
        const urls = files.map(f => f.url);
        setNewPost(prev => ({ ...prev, media_urls: urls }));
    };

    const handleStoryMediaUpload = (files) => {
        if (files.length > 0) {
            setNewStory(prev => ({ ...prev, media_url: files[0].url }));
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
        <div className="min-h-screen bg-black" data-testid="creator-dashboard-page">
            <Navbar />

            <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <h1 className="font-heading text-3xl md:text-4xl">
                                <span className="gold-text">Creator</span>
                                <span className="text-white ml-3">Studio</span>
                            </h1>
                            <button
                                onClick={() => navigate(`/creator/${creatorProfile?.id}`)}
                                className="px-4 py-1.5 text-sm border border-gold/50 text-gold hover:bg-gold/10 transition-colors"
                                data-testid="view-my-page-btn"
                            >
                                View My Page
                            </button>
                        </div>
                        <button 
                            onClick={() => navigate(`/creator/${creatorProfile?.id}`)}
                            className="text-white/50 hover:text-gold transition-colors cursor-pointer"
                        >
                            @{creatorProfile?.display_name || user?.username} - See how fans view your profile
                        </button>
                        
                        {/* Online Status Toggle */}
                        <div className="flex items-center gap-2 mt-3">
                            <span className="text-white/50 text-sm">Status:</span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleStatusChange('online')}
                                    className={`px-3 py-1 text-xs rounded transition-colors ${onlineStatus === 'online' ? 'bg-green-500 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
                                    data-testid="status-online"
                                >
                                    Online
                                </button>
                                <button
                                    onClick={() => handleStatusChange('away')}
                                    className={`px-3 py-1 text-xs rounded transition-colors ${onlineStatus === 'away' ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
                                    data-testid="status-away"
                                >
                                    Away
                                </button>
                                <button
                                    onClick={() => handleStatusChange('offline')}
                                    className={`px-3 py-1 text-xs rounded transition-colors ${onlineStatus === 'offline' ? 'bg-white/30 text-white' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
                                    data-testid="status-offline"
                                >
                                    Offline
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setGoLiveDialogOpen(true)}
                            className="px-5 py-3 bg-red-500 text-white font-bold flex items-center gap-2 hover:bg-red-600 transition-colors"
                            data-testid="go-live-btn"
                        >
                            <Radio className="w-5 h-5" />
                            Go Live
                        </button>
                        <button
                            onClick={() => setStoryDialogOpen(true)}
                            className="btn-secondary px-5 py-3 flex items-center gap-2"
                            data-testid="add-story-btn"
                        >
                            <Plus className="w-5 h-5" />
                            Story
                        </button>
                        <button
                            onClick={() => setCreateDialogOpen(true)}
                            className="gold-btn px-6 py-3 flex items-center gap-2"
                            data-testid="create-post-btn"
                        >
                            <Plus className="w-5 h-5" />
                            Create Post
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    <div className="card-luxury p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Users className="w-5 h-5 text-gold" />
                            <span className="text-white/50 text-sm uppercase tracking-wider">Subscribers</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{creatorProfile?.subscriber_count || 0}</p>
                    </div>
                    <div className="card-luxury p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <DollarSign className="w-5 h-5 text-gold" />
                            <span className="text-white/50 text-sm uppercase tracking-wider">Earnings</span>
                        </div>
                        <p className="text-3xl font-bold gold-text">${creatorProfile?.total_earnings?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="card-luxury p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <FileText className="w-5 h-5 text-gold" />
                            <span className="text-white/50 text-sm uppercase tracking-wider">Posts</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{content.length}</p>
                    </div>
                    <div className="card-luxury p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Heart className="w-5 h-5 text-gold" />
                            <span className="text-white/50 text-sm uppercase tracking-wider">Total Likes</span>
                        </div>
                        <p className="text-3xl font-bold text-white">
                            {content.reduce((sum, c) => sum + (c.like_count || 0), 0)}
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="content" className="space-y-6">
                    <TabsList className="bg-obsidian border border-white/10">
                        <TabsTrigger value="content" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                            Content
                        </TabsTrigger>
                        <TabsTrigger value="tips" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                            Tips Received
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="content">
                        {content.length === 0 ? (
                            <div className="card-luxury p-12 text-center">
                                <Crown className="w-12 h-12 text-gold/30 mx-auto mb-4" />
                                <h3 className="font-heading text-lg text-white mb-2">No Content Yet</h3>
                                <p className="text-white/50 mb-6">Create your first post to engage your subscribers</p>
                                <button
                                    onClick={() => setCreateDialogOpen(true)}
                                    className="gold-btn px-6 py-3 inline-flex items-center gap-2"
                                >
                                    <Plus className="w-5 h-5" />
                                    Create Post
                                </button>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {content.map((item) => (
                                    <div key={item.id} className="card-luxury p-5" data-testid={`content-item-${item.id}`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <span className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 ${
                                                item.visibility === 'public' || item.is_public 
                                                    ? 'bg-green-500/20 text-green-400' 
                                                    : item.visibility === 'unpublished'
                                                    ? 'bg-white/10 text-white/50'
                                                    : 'bg-gold/20 text-gold'
                                            }`}>
                                                {item.visibility === 'public' || item.is_public ? (
                                                    <><Globe className="w-3 h-3" /> Public</>
                                                ) : item.visibility === 'unpublished' ? (
                                                    <><EyeOff className="w-3 h-3" /> Draft</>
                                                ) : (
                                                    <><Lock className="w-3 h-3" /> Subscribers</>
                                                )}
                                            </span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEditContent(item)}
                                                    className="text-white/30 hover:text-gold transition-colors"
                                                    data-testid={`edit-${item.id}`}
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteContent(item.id)}
                                                    className="text-white/30 hover:text-red-500 transition-colors"
                                                    data-testid={`delete-${item.id}`}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        {item.title && (
                                            <h3 className="font-heading text-white mb-2">{item.title}</h3>
                                        )}
                                        {/* Media Preview */}
                                        {item.media_urls && item.media_urls.length > 0 && (
                                            <div className="mb-3 rounded overflow-hidden">
                                                {item.media_type === 'video' ? (
                                                    <video 
                                                        src={item.media_urls[0]} 
                                                        className="w-full h-40 object-cover"
                                                        controls
                                                    />
                                                ) : (
                                                    <img 
                                                        src={item.media_urls[0]} 
                                                        alt="" 
                                                        className="w-full h-40 object-cover"
                                                    />
                                                )}
                                                {item.media_urls.length > 1 && (
                                                    <div className="text-white/40 text-xs mt-1">
                                                        +{item.media_urls.length - 1} more
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {item.text && (
                                            <p className="text-white/60 text-sm mb-3 line-clamp-3">{item.text}</p>
                                        )}
                                        <div className="flex items-center gap-4 text-white/40 text-sm">
                                            <span className="flex items-center gap-1">
                                                <Heart className="w-4 h-4" />
                                                {item.like_count}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <DollarSign className="w-4 h-4" />
                                                ${item.tip_total?.toFixed(2) || '0.00'}
                                            </span>
                                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="tips">
                        {tips.length === 0 ? (
                            <div className="card-luxury p-12 text-center">
                                <DollarSign className="w-12 h-12 text-gold/30 mx-auto mb-4" />
                                <h3 className="font-heading text-lg text-white mb-2">No Tips Yet</h3>
                                <p className="text-white/50">Tips from your fans will appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {tips.map((tip) => (
                                    <div key={tip.id} className="card-luxury p-5 flex items-center justify-between">
                                        <div>
                                            <p className="text-white font-medium">{tip.user_display_name || 'Anonymous'}</p>
                                            {tip.message && (
                                                <p className="text-white/50 text-sm mt-1">"{tip.message}"</p>
                                            )}
                                            <p className="text-white/30 text-xs mt-2">
                                                {new Date(tip.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <span className="gold-text text-xl font-bold">${tip.amount.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </main>

            {/* Create Post Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="bg-obsidian border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-heading gold-text">Create New Post</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div>
                            <label className="text-white/70 text-sm uppercase tracking-wider mb-2 block">
                                Title (optional)
                            </label>
                            <input
                                type="text"
                                value={newPost.title}
                                onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                                className="input-luxury w-full"
                                placeholder="Give your post a title"
                                data-testid="post-title-input"
                            />
                        </div>
                        <div>
                            <label className="text-white/70 text-sm uppercase tracking-wider mb-2 block">
                                Content
                            </label>
                            <textarea
                                value={newPost.text}
                                onChange={(e) => setNewPost(prev => ({ ...prev, text: e.target.value }))}
                                className="input-luxury w-full h-24 resize-none"
                                placeholder="What's on your mind?"
                                data-testid="post-content-input"
                            />
                        </div>
                        
                        {/* Media Upload */}
                        <div>
                            <label className="text-white/70 text-sm uppercase tracking-wider mb-2 block">
                                Media (optional)
                            </label>
                            <FileUpload 
                                onUpload={handleMediaUpload}
                                multiple={true}
                                category="content"
                                accept="image/*,video/*"
                                maxSize={100}
                            />
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <span className="text-white/70 text-sm">Visibility</span>
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    onClick={() => setNewPost(prev => ({ ...prev, visibility: 'public' }))}
                                    className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1 ${newPost.visibility === 'public' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                                    data-testid="visibility-public"
                                >
                                    <Globe className="w-3 h-3" /> Public
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewPost(prev => ({ ...prev, visibility: 'subscribers' }))}
                                    className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1 ${newPost.visibility === 'subscribers' ? 'bg-gold/20 text-gold border border-gold/50' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                                    data-testid="visibility-subscribers"
                                >
                                    <Lock className="w-3 h-3" /> Subscribers
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewPost(prev => ({ ...prev, visibility: 'unpublished' }))}
                                    className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1 ${newPost.visibility === 'unpublished' ? 'bg-white/20 text-white border border-white/30' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                                    data-testid="visibility-unpublished"
                                >
                                    <EyeOff className="w-3 h-3" /> Draft
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={handleCreatePost}
                            disabled={posting}
                            className="gold-btn w-full py-3 flex items-center justify-center gap-2"
                            data-testid="submit-post-btn"
                        >
                            {posting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-5 h-5" />
                                    Create Post
                                </>
                            )}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Story Dialog */}
            <Dialog open={storyDialogOpen} onOpenChange={setStoryDialogOpen}>
                <DialogContent className="bg-obsidian border-white/10 max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="font-heading gold-text">Add Story (24hr)</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div>
                            <label className="text-white/70 text-sm uppercase tracking-wider mb-2 block">
                                Media URL *
                            </label>
                            <input
                                type="url"
                                value={newStory.media_url}
                                onChange={(e) => setNewStory(prev => ({ ...prev, media_url: e.target.value }))}
                                className="input-luxury w-full"
                                placeholder="https://example.com/image.jpg"
                                data-testid="story-media-input"
                            />
                        </div>
                        <div>
                            <label className="text-white/70 text-sm uppercase tracking-wider mb-2 block">
                                Caption (optional)
                            </label>
                            <input
                                type="text"
                                value={newStory.caption}
                                onChange={(e) => setNewStory(prev => ({ ...prev, caption: e.target.value }))}
                                className="input-luxury w-full"
                                placeholder="Add a caption..."
                                data-testid="story-caption-input"
                            />
                        </div>
                        <button
                            onClick={handleCreateStory}
                            disabled={posting}
                            className="gold-btn w-full py-3 flex items-center justify-center gap-2"
                            data-testid="submit-story-btn"
                        >
                            {posting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                            Post Story
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Go Live Dialog */}
            <Dialog open={goLiveDialogOpen} onOpenChange={setGoLiveDialogOpen}>
                <DialogContent className="bg-obsidian border-white/10 max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="font-heading gold-text flex items-center gap-2">
                            <Radio className="w-5 h-5 text-red-500" />
                            Go Live
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div>
                            <label className="text-white/70 text-sm uppercase tracking-wider mb-2 block">
                                Stream Title *
                            </label>
                            <input
                                type="text"
                                value={newStream.title}
                                onChange={(e) => setNewStream(prev => ({ ...prev, title: e.target.value }))}
                                className="input-luxury w-full"
                                placeholder="What are you streaming?"
                                data-testid="stream-title-input"
                            />
                        </div>
                        <div>
                            <label className="text-white/70 text-sm uppercase tracking-wider mb-2 block">
                                Description (optional)
                            </label>
                            <textarea
                                value={newStream.description}
                                onChange={(e) => setNewStream(prev => ({ ...prev, description: e.target.value }))}
                                className="input-luxury w-full h-24 resize-none"
                                placeholder="Tell viewers what to expect..."
                                data-testid="stream-description-input"
                            />
                        </div>
                        <button
                            onClick={handleGoLive}
                            disabled={posting}
                            className="w-full py-3 bg-red-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-red-600 transition-colors"
                            data-testid="start-live-btn"
                        >
                            {posting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radio className="w-5 h-5" />}
                            Start Stream
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Content Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="bg-obsidian border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
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
                                    data-testid="edit-title-input"
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
                                    data-testid="edit-content-input"
                                />
                            </div>
                            
                            {/* Current Media */}
                            {editingContent.media_urls?.length > 0 && (
                                <div>
                                    <label className="text-white/70 text-sm uppercase tracking-wider mb-2 block">
                                        Current Media
                                    </label>
                                    <div className="flex gap-2 flex-wrap">
                                        {editingContent.media_urls.map((url, idx) => (
                                            <div key={idx} className="relative w-20 h-20 rounded overflow-hidden">
                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex items-center justify-between">
                                <span className="text-white/70 text-sm">Visibility</span>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setEditingContent(prev => ({ ...prev, visibility: 'public' }))}
                                        className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1 ${editingContent.visibility === 'public' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                                    >
                                        <Globe className="w-3 h-3" /> Public
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingContent(prev => ({ ...prev, visibility: 'subscribers' }))}
                                        className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1 ${editingContent.visibility === 'subscribers' ? 'bg-gold/20 text-gold border border-gold/50' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                                    >
                                        <Lock className="w-3 h-3" /> Subscribers
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingContent(prev => ({ ...prev, visibility: 'unpublished' }))}
                                        className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1 ${editingContent.visibility === 'unpublished' ? 'bg-white/20 text-white border border-white/30' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                                    >
                                        <EyeOff className="w-3 h-3" /> Draft
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleUpdateContent}
                                disabled={posting}
                                className="gold-btn w-full py-3 flex items-center justify-center gap-2"
                                data-testid="update-content-btn"
                            >
                                {posting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Edit2 className="w-5 h-5" />
                                )}
                                Update Content
                            </button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CreatorDashboardPage;
