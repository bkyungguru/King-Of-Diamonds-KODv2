import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { Radio, Users, DollarSign, Crown, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

import { mediaUrl } from '../lib/media';

export const LiveStreamsPage = () => {
    const { api } = useAuth();
    const [streams, setStreams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStreams();
        const interval = setInterval(fetchStreams, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchStreams = async () => {
        try {
            const response = await api().get('/livestream/live');
            setStreams(response.data);
        } catch (error) {
            console.error('Failed to fetch streams:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black" data-testid="live-streams-page">
            <Navbar />

            <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-10">
                    <Radio className="w-8 h-8 text-red-500 animate-pulse" />
                    <div>
                        <h1 className="font-heading text-3xl">
                            <span className="gold-text">Live</span>
                            <span className="text-white ml-3">Now</span>
                        </h1>
                        <p className="text-white/50">Watch creators streaming live</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 text-gold animate-spin" />
                    </div>
                ) : streams.length === 0 ? (
                    <div className="text-center py-20">
                        <Radio className="w-16 h-16 text-gold/30 mx-auto mb-4" />
                        <h3 className="font-heading text-xl text-white mb-2">No Live Streams</h3>
                        <p className="text-white/50">Check back later for live content</p>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {streams.map((stream) => (
                            <Link
                                key={stream.id}
                                to={`/live/${stream.id}`}
                                className="card-luxury overflow-hidden group"
                                data-testid={`stream-card-${stream.id}`}
                            >
                                <div className="aspect-video relative bg-obsidian">
                                    {stream.thumbnail_url ? (
                                        <img
                                            src={mediaUrl(stream.thumbnail_url)}
                                            alt={stream.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Radio className="w-12 h-12 text-gold/30" />
                                        </div>
                                    )}
                                    
                                    {/* Live badge */}
                                    <span className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                                        <Radio className="w-3 h-3 animate-pulse" />
                                        LIVE
                                    </span>

                                    {/* Viewer count */}
                                    <span className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-black/70 text-white text-xs rounded">
                                        <Users className="w-3 h-3" />
                                        {stream.viewer_count}
                                    </span>
                                </div>

                                <div className="p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <Avatar className="w-10 h-10 border border-gold/30">
                                            <AvatarImage src={mediaUrl(stream.creator_profile_image)} />
                                            <AvatarFallback className="bg-obsidian text-gold">
                                                {stream.creator_display_name?.[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-medium truncate">{stream.title}</h3>
                                            <p className="text-white/50 text-sm">{stream.creator_display_name}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-1 text-gold">
                                            <DollarSign className="w-4 h-4" />
                                            ${stream.total_tips?.toFixed(0) || '0'} tips
                                        </span>
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

export default LiveStreamsPage;
