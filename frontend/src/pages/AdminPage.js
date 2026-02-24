import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { 
    Shield, Users, Crown, FileText, DollarSign, TrendingUp, 
    Loader2, CheckCircle, XCircle, Ban, Check, BarChart3,
    Eye, Edit2, Trash2, Flag, Image, Video, X, Play
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';

export const AdminPage = () => {
    const { isAdmin, isSuperAdmin, api } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [creators, setCreators] = useState([]);
    const [content, setContent] = useState([]);
    const [growthData, setGrowthData] = useState(null);
    const [revenueData, setRevenueData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedContent, setSelectedContent] = useState(null);
    const [contentDialogOpen, setContentDialogOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        if (!isAdmin) {
            navigate('/dashboard');
            return;
        }
        fetchAdminData();
    }, [isAdmin]);

    const fetchAdminData = async () => {
        try {
            const [statsRes, usersRes, creatorsRes, contentRes, growthRes, revenueRes] = await Promise.all([
                api().get('/admin/stats'),
                api().get('/admin/users'),
                api().get('/admin/creators'),
                api().get('/admin/content'),
                api().get('/admin/analytics/growth?days=14'),
                api().get('/admin/analytics/revenue?days=14')
            ]);
            setStats(statsRes.data);
            setUsers(usersRes.data);
            setCreators(creatorsRes.data);
            setContent(contentRes.data);
            setGrowthData(growthRes.data);
            setRevenueData(revenueRes.data);
        } catch (error) {
            console.error('Failed to fetch admin data:', error);
            toast.error('Failed to load admin data');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleUserStatus = async (userId, currentStatus) => {
        try {
            await api().put(`/admin/users/${userId}/status?is_active=${!currentStatus}`);
            toast.success(`User ${!currentStatus ? 'enabled' : 'disabled'}`);
            fetchAdminData();
        } catch (error) {
            toast.error('Failed to update user status');
        }
    };

    const handleVerifyCreator = async (creatorId, currentStatus) => {
        try {
            await api().put(`/admin/creators/${creatorId}/verify?is_verified=${!currentStatus}`);
            toast.success(`Creator ${!currentStatus ? 'verified' : 'unverified'}`);
            fetchAdminData();
        } catch (error) {
            toast.error('Failed to update creator');
        }
    };

    const handleDeleteContent = async (contentId) => {
        try {
            await api().delete(`/admin/content/${contentId}`);
            toast.success('Content removed');
            setContent(prev => prev.filter(c => c.id !== contentId));
            setContentDialogOpen(false);
        } catch (error) {
            toast.error('Failed to delete content');
        }
    };

    const handleFlagContent = async (contentId) => {
        try {
            await api().put(`/admin/content/${contentId}/flag`);
            toast.success('Content flagged for review');
            fetchAdminData();
        } catch (error) {
            toast.error('Failed to flag content');
        }
    };

    const handleEditContent = async () => {
        if (!selectedContent) return;
        try {
            await api().put(`/admin/content/${selectedContent.id}`, {
                title: selectedContent.title,
                text: selectedContent.text,
                visibility: selectedContent.visibility || (selectedContent.is_public ? 'public' : 'subscribers')
            });
            toast.success('Content updated');
            setEditMode(false);
            fetchAdminData();
        } catch (error) {
            toast.error('Failed to update content');
        }
    };

    const openContentDialog = (item) => {
        setSelectedContent(item);
        setEditMode(false);
        setContentDialogOpen(true);
    };

    const handleChangeRole = async (userId, newRole) => {
        try {
            await api().put(`/admin/users/${userId}/role?role=${newRole}`);
            toast.success(`User role changed to ${newRole}`);
            fetchAdminData();
        } catch (error) {
            toast.error('Failed to change role');
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
        <div className="min-h-screen bg-black" data-testid="admin-page">
            <Navbar />

            <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-10">
                    <Shield className="w-10 h-10 text-gold" />
                    <div>
                        <h1 className="font-heading text-3xl">
                            <span className="gold-text">Admin</span>
                            <span className="text-white ml-3">Panel</span>
                        </h1>
                        <p className="text-white/50">
                            {isSuperAdmin ? 'Super Admin Access' : 'Admin Access'}
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-10">
                    <div className="card-luxury p-4">
                        <Users className="w-5 h-5 text-gold mb-2" />
                        <p className="text-2xl font-bold text-white">{stats?.total_users || 0}</p>
                        <p className="text-white/50 text-xs uppercase tracking-wider">Users</p>
                    </div>
                    <div className="card-luxury p-4">
                        <Crown className="w-5 h-5 text-gold mb-2" />
                        <p className="text-2xl font-bold text-white">{stats?.total_creators || 0}</p>
                        <p className="text-white/50 text-xs uppercase tracking-wider">Creators</p>
                    </div>
                    <div className="card-luxury p-4">
                        <FileText className="w-5 h-5 text-gold mb-2" />
                        <p className="text-2xl font-bold text-white">{stats?.total_content || 0}</p>
                        <p className="text-white/50 text-xs uppercase tracking-wider">Posts</p>
                    </div>
                    <div className="card-luxury p-4">
                        <DollarSign className="w-5 h-5 text-gold mb-2" />
                        <p className="text-2xl font-bold text-white">{stats?.total_subscriptions || 0}</p>
                        <p className="text-white/50 text-xs uppercase tracking-wider">Subs</p>
                    </div>
                    <div className="card-luxury p-4">
                        <DollarSign className="w-5 h-5 text-gold mb-2" />
                        <p className="text-2xl font-bold gold-text">${stats?.total_tips_amount?.toFixed(0) || 0}</p>
                        <p className="text-white/50 text-xs uppercase tracking-wider">Tips</p>
                    </div>
                    <div className="card-luxury p-4">
                        <TrendingUp className="w-5 h-5 text-green-500 mb-2" />
                        <p className="text-2xl font-bold text-green-400">+{stats?.new_users_today || 0}</p>
                        <p className="text-white/50 text-xs uppercase tracking-wider">Today</p>
                    </div>
                    <div className="card-luxury p-4">
                        <TrendingUp className="w-5 h-5 text-green-500 mb-2" />
                        <p className="text-2xl font-bold text-green-400">+{stats?.new_creators_today || 0}</p>
                        <p className="text-white/50 text-xs uppercase tracking-wider">New Creators</p>
                    </div>
                </div>

                <Tabs defaultValue="analytics" className="space-y-6">
                    <TabsList className="bg-obsidian border border-white/10">
                        <TabsTrigger value="analytics" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Analytics
                        </TabsTrigger>
                        <TabsTrigger value="users" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                            <Users className="w-4 h-4 mr-2" />
                            Users
                        </TabsTrigger>
                        <TabsTrigger value="creators" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                            <Crown className="w-4 h-4 mr-2" />
                            Creators
                        </TabsTrigger>
                        <TabsTrigger value="content" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                            <FileText className="w-4 h-4 mr-2" />
                            Content
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="analytics">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* User Growth Chart */}
                            <div className="card-luxury p-6">
                                <h3 className="font-heading text-lg text-white mb-4">User Growth (14 days)</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <LineChart data={growthData?.user_growth || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="date" stroke="#666" tick={{ fill: '#666' }} />
                                        <YAxis stroke="#666" tick={{ fill: '#666' }} />
                                        <Tooltip 
                                            contentStyle={{ background: '#0a0a0a', border: '1px solid #333' }}
                                            labelStyle={{ color: '#fff' }}
                                        />
                                        <Line type="monotone" dataKey="count" stroke="#D4AF37" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Revenue Chart */}
                            <div className="card-luxury p-6">
                                <h3 className="font-heading text-lg text-white mb-4">Revenue (14 days)</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={revenueData?.revenue || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="date" stroke="#666" tick={{ fill: '#666' }} />
                                        <YAxis stroke="#666" tick={{ fill: '#666' }} />
                                        <Tooltip 
                                            contentStyle={{ background: '#0a0a0a', border: '1px solid #333' }}
                                            labelStyle={{ color: '#fff' }}
                                        />
                                        <Bar dataKey="subscriptions" fill="#D4AF37" name="Subscriptions" />
                                        <Bar dataKey="tips" fill="#B9F2FF" name="Tips" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="users">
                        <div className="card-luxury overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left p-4 text-white/50 text-sm uppercase tracking-wider">User</th>
                                            <th className="text-left p-4 text-white/50 text-sm uppercase tracking-wider">Role</th>
                                            <th className="text-left p-4 text-white/50 text-sm uppercase tracking-wider">Status</th>
                                            <th className="text-left p-4 text-white/50 text-sm uppercase tracking-wider">Joined</th>
                                            <th className="text-left p-4 text-white/50 text-sm uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((u) => (
                                            <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="p-4">
                                                    <p className="text-white">{u.display_name || u.username || 'User'}</p>
                                                    <p className="text-white/40 text-sm">{u.email}</p>
                                                </td>
                                                <td className="p-4">
                                                    {isSuperAdmin ? (
                                                        <select
                                                            value={u.role}
                                                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                                                            className="bg-obsidian border border-white/10 text-white text-sm px-2 py-1"
                                                            data-testid={`role-select-${u.id}`}
                                                        >
                                                            <option value="user">User</option>
                                                            <option value="creator">Creator</option>
                                                            <option value="admin">Admin</option>
                                                            <option value="superadmin">Super Admin</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`px-2 py-1 text-xs ${u.role === 'admin' || u.role === 'superadmin' ? 'text-gold' : 'text-white/50'}`}>
                                                            {u.role}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`flex items-center gap-1 ${u.is_active ? 'text-green-400' : 'text-red-400'}`}>
                                                        {u.is_active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                                        {u.is_active ? 'Active' : 'Disabled'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-white/50 text-sm">
                                                    {new Date(u.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="p-4">
                                                    <button
                                                        onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                                                        className={`px-3 py-1 text-sm ${u.is_active ? 'text-red-400 hover:bg-red-500/20' : 'text-green-400 hover:bg-green-500/20'} rounded transition-colors`}
                                                        data-testid={`toggle-user-${u.id}`}
                                                    >
                                                        {u.is_active ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="creators">
                        <div className="card-luxury overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left p-4 text-white/50 text-sm uppercase tracking-wider">Creator</th>
                                            <th className="text-left p-4 text-white/50 text-sm uppercase tracking-wider">Subscribers</th>
                                            <th className="text-left p-4 text-white/50 text-sm uppercase tracking-wider">Earnings</th>
                                            <th className="text-left p-4 text-white/50 text-sm uppercase tracking-wider">Verified</th>
                                            <th className="text-left p-4 text-white/50 text-sm uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {creators.map((c) => (
                                            <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="p-4">
                                                    <p className="text-white">{c.display_name}</p>
                                                    <p className="text-white/40 text-sm">${c.subscription_price}/mo</p>
                                                </td>
                                                <td className="p-4 text-white">{c.subscriber_count}</td>
                                                <td className="p-4 gold-text">${c.total_earnings?.toFixed(2) || '0.00'}</td>
                                                <td className="p-4">
                                                    {c.is_verified ? (
                                                        <CheckCircle className="w-5 h-5 text-gold" />
                                                    ) : (
                                                        <XCircle className="w-5 h-5 text-white/30" />
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <button
                                                        onClick={() => handleVerifyCreator(c.id, c.is_verified)}
                                                        className={`px-3 py-1 text-sm ${c.is_verified ? 'text-white/50' : 'text-gold'} hover:bg-white/5 rounded transition-colors`}
                                                        data-testid={`verify-creator-${c.id}`}
                                                    >
                                                        {c.is_verified ? 'Unverify' : 'Verify'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="content">
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {content.map((c) => (
                                <div 
                                    key={c.id} 
                                    className="card-luxury overflow-hidden cursor-pointer group hover:border-gold/30 transition-colors"
                                    onClick={() => openContentDialog(c)}
                                    data-testid={`content-card-${c.id}`}
                                >
                                    {/* Media Preview */}
                                    <div className="aspect-video bg-obsidian relative overflow-hidden">
                                        {c.media_urls && c.media_urls.length > 0 ? (
                                            c.media_type === 'video' ? (
                                                <div className="relative w-full h-full">
                                                    <video 
                                                        src={c.media_urls[0]} 
                                                        className="w-full h-full object-cover"
                                                        muted
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                        <Play className="w-10 h-10 text-white/80" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <img 
                                                    src={c.media_urls[0]} 
                                                    alt="" 
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                />
                                            )
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white/20">
                                                <FileText className="w-12 h-12" />
                                            </div>
                                        )}
                                        
                                        {/* Badge overlay */}
                                        <div className="absolute top-2 left-2 flex gap-1">
                                            <span className={`px-2 py-0.5 text-xs rounded ${
                                                c.visibility === 'public' || c.is_public 
                                                    ? 'bg-green-500/80 text-white' 
                                                    : c.visibility === 'unpublished'
                                                    ? 'bg-white/80 text-black'
                                                    : 'bg-gold/80 text-black'
                                            }`}>
                                                {c.visibility === 'public' || c.is_public ? 'Public' : c.visibility === 'unpublished' ? 'Draft' : 'Subs'}
                                            </span>
                                            {c.is_flagged && (
                                                <span className="px-2 py-0.5 text-xs rounded bg-red-500/80 text-white">
                                                    Flagged
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Media count */}
                                        {c.media_urls && c.media_urls.length > 1 && (
                                            <div className="absolute top-2 right-2 px-2 py-0.5 text-xs rounded bg-black/60 text-white">
                                                +{c.media_urls.length - 1}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Content info */}
                                    <div className="p-3">
                                        <p className="text-white text-sm line-clamp-2 mb-2">
                                            {c.title || c.text?.substring(0, 80) || 'No content'}
                                        </p>
                                        <div className="flex items-center justify-between text-xs text-white/40">
                                            <span>{new Date(c.created_at).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-1">
                                                ❤️ {c.like_count}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {content.length === 0 && (
                            <div className="text-center py-12 text-white/40">
                                No content found
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </main>

            {/* Content Detail Dialog */}
            <Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
                <DialogContent className="bg-obsidian border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-heading gold-text flex items-center justify-between">
                            <span>Content Details</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setEditMode(!editMode)}
                                    className={`p-2 rounded ${editMode ? 'bg-gold text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                    title="Edit"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => selectedContent && handleFlagContent(selectedContent.id)}
                                    className="p-2 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30"
                                    title="Flag"
                                >
                                    <Flag className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => selectedContent && handleDeleteContent(selectedContent.id)}
                                    className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedContent && (
                        <div className="space-y-4 mt-4">
                            {/* Media Preview */}
                            {selectedContent.media_urls && selectedContent.media_urls.length > 0 && (
                                <div className="space-y-2">
                                    <div className="rounded overflow-hidden bg-black">
                                        {selectedContent.media_type === 'video' ? (
                                            <video 
                                                src={selectedContent.media_urls[0]} 
                                                className="w-full max-h-80 object-contain"
                                                controls
                                            />
                                        ) : (
                                            <img 
                                                src={selectedContent.media_urls[0]} 
                                                alt="" 
                                                className="w-full max-h-80 object-contain"
                                            />
                                        )}
                                    </div>
                                    {selectedContent.media_urls.length > 1 && (
                                        <div className="flex gap-2 overflow-x-auto py-2">
                                            {selectedContent.media_urls.map((url, idx) => (
                                                <img 
                                                    key={idx}
                                                    src={url} 
                                                    alt="" 
                                                    className="w-16 h-16 object-cover rounded flex-shrink-0"
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Content Info */}
                            {editMode ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-white/70 text-sm block mb-1">Title</label>
                                        <input
                                            type="text"
                                            value={selectedContent.title || ''}
                                            onChange={(e) => setSelectedContent(prev => ({ ...prev, title: e.target.value }))}
                                            className="input-luxury w-full"
                                            placeholder="Title"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-white/70 text-sm block mb-1">Content</label>
                                        <textarea
                                            value={selectedContent.text || ''}
                                            onChange={(e) => setSelectedContent(prev => ({ ...prev, text: e.target.value }))}
                                            className="input-luxury w-full h-24 resize-none"
                                            placeholder="Content text"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-white/70 text-sm block mb-1">Visibility</label>
                                        <select
                                            value={selectedContent.visibility || (selectedContent.is_public ? 'public' : 'subscribers')}
                                            onChange={(e) => setSelectedContent(prev => ({ ...prev, visibility: e.target.value }))}
                                            className="input-luxury w-full"
                                        >
                                            <option value="public">Public</option>
                                            <option value="subscribers">Subscribers Only</option>
                                            <option value="unpublished">Unpublished (Draft)</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleEditContent}
                                        className="gold-btn w-full py-2"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {selectedContent.title && (
                                        <h3 className="text-white font-heading text-lg">{selectedContent.title}</h3>
                                    )}
                                    {selectedContent.text && (
                                        <p className="text-white/70">{selectedContent.text}</p>
                                    )}
                                    <div className="flex flex-wrap gap-4 text-sm text-white/50 pt-4 border-t border-white/10">
                                        <span>Created: {new Date(selectedContent.created_at).toLocaleString()}</span>
                                        <span>Likes: {selectedContent.like_count}</span>
                                        <span>Type: {selectedContent.media_type}</span>
                                        <span className={`px-2 py-0.5 rounded ${
                                            selectedContent.visibility === 'public' || selectedContent.is_public 
                                                ? 'bg-green-500/20 text-green-400' 
                                                : 'bg-gold/20 text-gold'
                                        }`}>
                                            {selectedContent.visibility === 'public' || selectedContent.is_public ? 'Public' : 'Subscribers'}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminPage;
