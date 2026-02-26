import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Crown, Users, Search, Loader2, CheckCircle } from 'lucide-react';
import axios from 'axios';

import { mediaUrl } from '../lib/media';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const ExplorePage = () => {
    const [creators, setCreators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCreators();
    }, []);

    const fetchCreators = async () => {
        try {
            const response = await axios.get(`${API}/creators/`);
            setCreators(response.data);
        } catch (error) {
            console.error('Failed to fetch creators:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCreators = creators.filter(creator =>
        creator.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creator.bio?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-black" data-testid="explore-page">
            <Navbar />
            
            <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="font-heading text-4xl md:text-5xl mb-4">
                        <span className="gold-text">Explore</span>
                        <span className="text-white ml-3">Creators</span>
                    </h1>
                    <p className="text-white/50 max-w-xl mx-auto">
                        Discover exclusive content from our premium creators
                    </p>
                </div>

                {/* Search */}
                <div className="max-w-xl mx-auto mb-12">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search creators..."
                            className="input-luxury w-full pl-12 py-4"
                            data-testid="search-input"
                        />
                    </div>
                </div>

                {/* Creators Grid */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 text-gold animate-spin" />
                    </div>
                ) : filteredCreators.length === 0 ? (
                    <div className="text-center py-20">
                        <Crown className="w-16 h-16 text-gold/30 mx-auto mb-4" />
                        <h3 className="font-heading text-xl text-white mb-2">No Creators Found</h3>
                        <p className="text-white/50">
                            {searchTerm ? 'Try a different search term' : 'Be the first to become a creator!'}
                        </p>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCreators.map((creator) => (
                            <Link
                                key={creator.id}
                                to={`/creator/${creator.id}`}
                                className="card-luxury overflow-hidden group"
                                data-testid={`creator-card-${creator.id}`}
                            >
                                <div className="aspect-[3/4] relative overflow-hidden">
                                    {creator.profile_image_url ? (
                                        <img
                                            src={mediaUrl(creator.profile_image_url)}
                                            alt={creator.display_name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-gold/20 to-transparent flex items-center justify-center">
                                            <Crown className="w-16 h-16 text-gold/50" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                                    
                                    {/* Online Status Badge */}
                                    {creator.online_status === 'online' && (
                                        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-green-500/90 rounded-full">
                                            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                            <span className="text-white text-xs font-medium">Online</span>
                                        </div>
                                    )}
                                    {creator.online_status === 'away' && (
                                        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-yellow-500/90 rounded-full">
                                            <span className="w-2 h-2 bg-white rounded-full" />
                                            <span className="text-black text-xs font-medium">Away</span>
                                        </div>
                                    )}
                                    
                                    {/* Creator Info */}
                                    <div className="absolute bottom-0 left-0 right-0 p-5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-heading text-lg text-white">{creator.display_name}</h3>
                                            {creator.is_verified && (
                                                <CheckCircle className="w-4 h-4 text-gold" />
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-white/50 text-sm flex items-center gap-1">
                                                <Users className="w-4 h-4" />
                                                {creator.subscriber_count} subscribers
                                            </span>
                                            <span className="gold-text font-medium">
                                                ${creator.subscription_price}/mo
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ExplorePage;
