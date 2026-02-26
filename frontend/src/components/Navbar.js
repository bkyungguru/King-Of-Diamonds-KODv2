import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Diamond, User, LogOut, LayoutDashboard, MessageSquare, Settings, Crown, Shield, Radio, Lock, Compass, BarChart3 } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { NotificationBell } from './NotificationBell';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

export const Navbar = () => {
    const { user, isAuthenticated, isCreator, isAdmin, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10" data-testid="navbar">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group" data-testid="navbar-logo">
                        <Diamond className="w-8 h-8 text-gold transition-transform group-hover:rotate-12" />
                        <span className="font-heading text-xl gold-text hidden sm:block">KING OF DIAMONDS</span>
                    </Link>

                    {/* Search Bar - Desktop */}
                    <div className="hidden md:block flex-1 max-w-md mx-4">
                        <SearchBar />
                    </div>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link 
                            to="/discover" 
                            className="text-white/70 hover:text-gold transition-colors uppercase tracking-widest text-sm flex items-center gap-1"
                            data-testid="nav-discover"
                        >
                            <Compass className="w-4 h-4" />
                            Discover
                        </Link>
                        <Link 
                            to="/explore" 
                            className="text-white/70 hover:text-gold transition-colors uppercase tracking-widest text-sm"
                            data-testid="nav-explore"
                        >
                            Explore
                        </Link>
                        <Link 
                            to="/live" 
                            className="text-white/70 hover:text-gold transition-colors uppercase tracking-widest text-sm flex items-center gap-2"
                            data-testid="nav-live"
                        >
                            <Radio className="w-4 h-4 text-red-500" />
                            Live
                        </Link>
                        {isAuthenticated && (
                            <Link 
                                to="/feed" 
                                className="text-white/70 hover:text-gold transition-colors uppercase tracking-widest text-sm"
                                data-testid="nav-feed"
                            >
                                Feed
                            </Link>
                        )}
                    </div>

                    {/* Auth Section */}
                    <div className="flex items-center gap-4">
                        {isAuthenticated && <NotificationBell />}
                        {isAuthenticated ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-2 hover:opacity-80 transition-opacity" data-testid="user-menu-trigger">
                                        <Avatar className="w-9 h-9 border border-gold/30">
                                            <AvatarImage src={user?.avatar_url} />
                                            <AvatarFallback className="bg-obsidian text-gold">
                                                {user?.display_name?.[0] || user?.email?.[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 bg-obsidian border-white/10">
                                    <div className="px-3 py-2 border-b border-white/10">
                                        <p className="font-medium text-white">{user?.display_name || user?.username}</p>
                                        <p className="text-sm text-white/50">{user?.email}</p>
                                    </div>
                                    
                                    <DropdownMenuItem onClick={() => navigate('/dashboard')} className="cursor-pointer" data-testid="menu-dashboard">
                                        <LayoutDashboard className="w-4 h-4 mr-2 text-gold" />
                                        Dashboard
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem onClick={() => navigate('/messages')} className="cursor-pointer" data-testid="menu-messages">
                                        <MessageSquare className="w-4 h-4 mr-2 text-gold" />
                                        Messages
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem onClick={() => navigate('/ppv')} className="cursor-pointer" data-testid="menu-ppv">
                                        <Lock className="w-4 h-4 mr-2 text-gold" />
                                        PPV Inbox
                                    </DropdownMenuItem>
                                    
                                    {isCreator && (
                                        <DropdownMenuItem onClick={() => navigate('/creator/dashboard')} className="cursor-pointer" data-testid="menu-creator-dashboard">
                                            <Crown className="w-4 h-4 mr-2 text-gold" />
                                            Creator Studio
                                        </DropdownMenuItem>
                                    )}
                                    
                                    {(isCreator || isAdmin) && (
                                        <DropdownMenuItem onClick={() => navigate('/analytics')} className="cursor-pointer" data-testid="menu-analytics">
                                            <BarChart3 className="w-4 h-4 mr-2 text-gold" />
                                            Analytics
                                        </DropdownMenuItem>
                                    )}
                                    
                                    {isAdmin && (
                                        <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer" data-testid="menu-admin">
                                            <Shield className="w-4 h-4 mr-2 text-gold" />
                                            Admin Panel
                                        </DropdownMenuItem>
                                    )}
                                    
                                    <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer" data-testid="menu-settings">
                                        <Settings className="w-4 h-4 mr-2 text-gold" />
                                        Settings
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuSeparator className="bg-white/10" />
                                    
                                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400" data-testid="menu-logout">
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Logout
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link
                                    to="/login"
                                    className="text-white/70 hover:text-gold transition-colors uppercase tracking-widest text-sm"
                                    data-testid="nav-login"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="gold-btn px-5 py-2 text-sm"
                                    data-testid="nav-register"
                                >
                                    Join Now
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
