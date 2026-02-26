import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { ImageCropper } from '../components/ImageCropper';
import { User, Mail, Loader2, Save, LogOut, Crown, Camera, Bell } from 'lucide-react';
import { NotificationSettings } from '../components/NotificationSettings';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export const SettingsPage = () => {
    const { user, creatorProfile, isCreator, updateUser, updateCreator, logout, api, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [avatarCropperOpen, setAvatarCropperOpen] = useState(false);
    const [profileCropperOpen, setProfileCropperOpen] = useState(false);
    const [coverCropperOpen, setCoverCropperOpen] = useState(false);
    
    const [userForm, setUserForm] = useState({
        username: user?.username || '',
        display_name: user?.display_name || '',
        bio: user?.bio || ''
    });

    const [creatorForm, setCreatorForm] = useState({
        display_name: creatorProfile?.display_name || '',
        bio: creatorProfile?.bio || '',
        subscription_price: creatorProfile?.subscription_price || 9.99
    });

    const handleUserUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateUser(userForm);
            toast.success('Profile updated!');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatorUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateCreator(creatorForm);
            toast.success('Creator profile updated!');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update creator profile');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarSave = async (blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'avatar.jpg');

        try {
            await api().post('/uploads/avatar', formData);
            toast.success('Avatar updated!');
            await refreshUser();
        } catch (error) {
            toast.error('Failed to upload avatar');
        }
    };

    const handleProfileImageSave = async (blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'profile.jpg');

        try {
            await api().post('/uploads/profile', formData);
            toast.success('Profile image updated!');
            await refreshUser();
        } catch (error) {
            toast.error('Failed to upload profile image');
        }
    };

    const handleCoverImageSave = async (blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'cover.jpg');

        try {
            await api().post('/uploads/cover', formData);
            toast.success('Cover image updated!');
            await refreshUser();
        } catch (error) {
            toast.error('Failed to upload cover image');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-black" data-testid="settings-page">
            <Navbar />

            <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
                <h1 className="font-heading text-3xl mb-8">
                    <span className="gold-text">Account</span>
                    <span className="text-white ml-3">Settings</span>
                </h1>

                <Tabs defaultValue="profile" className="space-y-8">
                    <TabsList className="bg-obsidian border border-white/10">
                        <TabsTrigger value="profile" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                            <User className="w-4 h-4 mr-2" />
                            Profile
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                            <Bell className="w-4 h-4 mr-2" />
                            Notifications
                        </TabsTrigger>
                        {isCreator && (
                            <TabsTrigger value="creator" className="data-[state=active]:bg-gold data-[state=active]:text-black">
                                <Crown className="w-4 h-4 mr-2" />
                                Creator
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="profile">
                        <div className="card-luxury p-8">
                            {/* Avatar */}
                            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-white/10">
                                <div className="relative group">
                                    <Avatar className="w-20 h-20 border-2 border-gold/30">
                                        <AvatarImage src={user?.avatar_url} />
                                        <AvatarFallback className="bg-obsidian text-gold text-2xl">
                                            {user?.display_name?.[0] || user?.email?.[0]?.toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <button
                                        onClick={() => setAvatarCropperOpen(true)}
                                        className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        data-testid="change-avatar-btn"
                                    >
                                        <Camera className="w-6 h-6 text-white" />
                                    </button>
                                </div>
                                <div>
                                    <h3 className="text-white font-medium mb-2">Profile Picture</h3>
                                    <button 
                                        onClick={() => setAvatarCropperOpen(true)}
                                        className="btn-secondary px-4 py-2 text-sm"
                                    >
                                        Change Avatar
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleUserUpdate} className="space-y-6">
                                <div>
                                    <label className="block text-white/70 text-sm uppercase tracking-wider mb-2">
                                        Email
                                    </label>
                                    <div className="input-luxury w-full bg-white/5 flex items-center gap-3">
                                        <Mail className="w-5 h-5 text-white/30" />
                                        <span className="text-white/50">{user?.email}</span>
                                    </div>
                                    <p className="text-white/30 text-sm mt-1">Email cannot be changed</p>
                                </div>

                                <div>
                                    <label className="block text-white/70 text-sm uppercase tracking-wider mb-2">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        value={userForm.username}
                                        onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                                        className="input-luxury w-full"
                                        placeholder="@username"
                                        data-testid="username-input"
                                    />
                                </div>

                                <div>
                                    <label className="block text-white/70 text-sm uppercase tracking-wider mb-2">
                                        Display Name
                                    </label>
                                    <input
                                        type="text"
                                        value={userForm.display_name}
                                        onChange={(e) => setUserForm(prev => ({ ...prev, display_name: e.target.value }))}
                                        className="input-luxury w-full"
                                        placeholder="Your Name"
                                        data-testid="displayname-input"
                                    />
                                </div>

                                <div>
                                    <label className="block text-white/70 text-sm uppercase tracking-wider mb-2">
                                        Bio
                                    </label>
                                    <textarea
                                        value={userForm.bio}
                                        onChange={(e) => setUserForm(prev => ({ ...prev, bio: e.target.value }))}
                                        className="input-luxury w-full h-24 resize-none"
                                        placeholder="Tell us about yourself..."
                                        data-testid="bio-input"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="gold-btn px-6 py-3 flex items-center gap-2"
                                    data-testid="save-profile-btn"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Save className="w-5 h-5" />
                                    )}
                                    Save Changes
                                </button>
                            </form>
                        </div>

                        {/* Danger Zone */}
                        <div className="card-luxury p-8 mt-6 border-red-500/30">
                            <h3 className="font-heading text-lg text-red-400 mb-4">Danger Zone</h3>
                            <button
                                onClick={handleLogout}
                                className="px-6 py-3 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors flex items-center gap-2"
                                data-testid="logout-btn"
                            >
                                <LogOut className="w-5 h-5" />
                                Log Out
                            </button>
                        </div>
                    </TabsContent>

                    <TabsContent value="notifications">
                        <div className="card-luxury p-8">
                            <NotificationSettings />
                        </div>
                    </TabsContent>

                    {isCreator && (
                        <TabsContent value="creator">
                            <div className="card-luxury p-8">
                                <h2 className="font-heading text-xl gold-text mb-6">Creator Settings</h2>

                                {/* Creator Images */}
                                <div className="mb-8 pb-8 border-b border-white/10">
                                    <h3 className="text-white/70 text-sm uppercase tracking-wider mb-4">Creator Images</h3>
                                    <div className="flex flex-wrap gap-4">
                                        {/* Profile Image */}
                                        <div className="relative group">
                                            <div className="w-24 h-24 rounded-full overflow-hidden bg-obsidian border-2 border-gold/30">
                                                {creatorProfile?.profile_image_url ? (
                                                    <img src={creatorProfile.profile_image_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Crown className="w-8 h-8 text-gold/50" />
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setProfileCropperOpen(true)}
                                                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Camera className="w-5 h-5 text-white" />
                                            </button>
                                            <p className="text-white/50 text-xs mt-1 text-center">Profile</p>
                                        </div>
                                        
                                        {/* Cover Image */}
                                        <div className="relative group flex-1 min-w-[200px]">
                                            <div className="h-24 rounded overflow-hidden bg-obsidian border-2 border-gold/30">
                                                {creatorProfile?.cover_image_url ? (
                                                    <img src={creatorProfile.cover_image_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-gold/10 to-transparent">
                                                        <span className="text-white/30 text-sm">Cover Image</span>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setCoverCropperOpen(true)}
                                                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Camera className="w-5 h-5 text-white" />
                                            </button>
                                            <p className="text-white/50 text-xs mt-1">Cover</p>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handleCreatorUpdate} className="space-y-6">
                                    <div>
                                        <label className="block text-white/70 text-sm uppercase tracking-wider mb-2">
                                            Creator Display Name
                                        </label>
                                        <input
                                            type="text"
                                            value={creatorForm.display_name}
                                            onChange={(e) => setCreatorForm(prev => ({ ...prev, display_name: e.target.value }))}
                                            className="input-luxury w-full"
                                            data-testid="creator-name-input"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-white/70 text-sm uppercase tracking-wider mb-2">
                                            Creator Bio
                                        </label>
                                        <textarea
                                            value={creatorForm.bio}
                                            onChange={(e) => setCreatorForm(prev => ({ ...prev, bio: e.target.value }))}
                                            className="input-luxury w-full h-32 resize-none"
                                            data-testid="creator-bio-input"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-white/70 text-sm uppercase tracking-wider mb-2">
                                            Subscription Price ($/month)
                                        </label>
                                        <input
                                            type="number"
                                            value={creatorForm.subscription_price}
                                            onChange={(e) => setCreatorForm(prev => ({ ...prev, subscription_price: parseFloat(e.target.value) || 0 }))}
                                            className="input-luxury w-full"
                                            min="1"
                                            max="100"
                                            step="0.01"
                                            data-testid="creator-price-input"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="gold-btn px-6 py-3 flex items-center gap-2"
                                        data-testid="save-creator-btn"
                                    >
                                        {loading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Save className="w-5 h-5" />
                                        )}
                                        Save Creator Settings
                                    </button>
                                </form>
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            </main>

            {/* Image Croppers */}
            <ImageCropper
                open={avatarCropperOpen}
                onClose={() => setAvatarCropperOpen(false)}
                onSave={handleAvatarSave}
                aspectRatio={1}
                title="Crop Avatar"
            />
            <ImageCropper
                open={profileCropperOpen}
                onClose={() => setProfileCropperOpen(false)}
                onSave={handleProfileImageSave}
                aspectRatio={1}
                title="Crop Profile Image"
            />
            <ImageCropper
                open={coverCropperOpen}
                onClose={() => setCoverCropperOpen(false)}
                onSave={handleCoverImageSave}
                aspectRatio={16/9}
                title="Crop Cover Image"
            />
        </div>
    );
};

export default SettingsPage;
