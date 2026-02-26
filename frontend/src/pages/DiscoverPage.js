import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Crown, Users, Loader2, TrendingUp, Sparkles, Star, Hash, CheckCircle, Image } from 'lucide-react';
import axios from 'axios';

import { mediaUrl } from '../lib/media';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CreatorCard = ({ creator }) => (
    <Link to={`/creator/${creator.id}`} className="card-luxury overflow-hidden group flex-shrink-0 w-64 sm:w-auto">
        <div className="aspect-[3/4] relative overflow-hidden">
            {creator.profile_image_url ? (
                <img src={mediaUrl(creator.profile_image_url)} alt={creator.display_name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-gold/20 to-transparent flex items-center justify-center">
                    <Crown className="w-16 h-16 text-gold/50" />
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            {creator.online_status === 'online' && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-green-500/90 rounded-full">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-white text-xs font-medium">Online</span>
                </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-heading text-base text-white truncate">{creator.display_name}</h3>
                    {creator.is_verified && <CheckCircle className="w-4 h-4 text-gold flex-shrink-0" />}
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-white/50 text-xs flex items-center gap-1">
                        <Users className="w-3 h-3" />{creator.subscriber_count}
                    </span>
                    <span className="gold-text text-sm font-medium">${creator.subscription_price}/mo</span>
                </div>
                {creator.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {creator.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded-full">{tag}</span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </Link>
);

const Section = ({ icon: Icon, title, children, color = "text-gold" }) => (
    <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
            <Icon className={`w-6 h-6 ${color}`} />
            <h2 className="font-heading text-2xl text-white">{title}</h2>
        </div>
        {children}
    </section>
);

export const DiscoverPage = () => {
    const [searchParams] = useSearchParams();
    const tagFilter = searchParams.get('tag');
    const [featured, setFeatured] = useState([]);
    const [trending, setTrending] = useState([]);
    const [newCreators, setNewCreators] = useState([]);
    const [tags, setTags] = useState([]);
    const [content, setContent] = useState([]);
    const [contentPage, setContentPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [activeTag, setActiveTag] = useState(tagFilter || null);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [featRes, trendRes, newRes, tagsRes] = await Promise.all([
                    axios.get(`${API}/discover/featured`),
                    axios.get(`${API}/discover/trending`, { params: { limit: 12 } }),
                    axios.get(`${API}/discover/new`, { params: { limit: 8 } }),
                    axios.get(`${API}/discover/tags`),
                ]);
                setFeatured(featRes.data);
                setTrending(trendRes.data);
                setNewCreators(newRes.data);
                setTags(tagsRes.data);
            } catch (err) {
                console.error('Failed to load discover:', err);
            }
            setLoading(false);
        };
        fetchAll();
    }, []);

    const fetchContent = useCallback(async (page = 0, tag = activeTag) => {
        if (page === 0) setContent([]);
        setLoadingMore(true);
        try {
            const params = { skip: page * 20, limit: 20 };
            if (tag) params.tag = tag;
            const res = await axios.get(`${API}/discover/content`, { params });
            if (page === 0) {
                setContent(res.data);
            } else {
                setContent(prev => [...prev, ...res.data]);
            }
            setHasMore(res.data.length === 20);
        } catch { }
        setLoadingMore(false);
    }, [activeTag]);

    useEffect(() => {
        fetchContent(0, activeTag);
        setContentPage(0);
    }, [activeTag, fetchContent]);

    const loadMore = () => {
        const next = contentPage + 1;
        setContentPage(next);
        fetchContent(next);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black">
                <Navbar />
                <div className="flex justify-center items-center pt-40">
                    <Loader2 className="w-8 h-8 text-gold animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black">
            <Navbar />
            <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="font-heading text-4xl md:text-5xl mb-4">
                        <span className="gold-text">Discover</span>
                    </h1>
                    <p className="text-white/50 max-w-xl mx-auto">
                        Find your next favorite creator
                    </p>
                </div>

                {/* Featured */}
                {featured.length > 0 && (
                    <Section icon={Star} title="Featured Creators">
                        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
                            {featured.map((c) => <CreatorCard key={c.id} creator={c} />)}
                        </div>
                    </Section>
                )}

                {/* Trending */}
                {trending.length > 0 && (
                    <Section icon={TrendingUp} title="Trending" color="text-orange-400">
                        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
                            {trending.slice(0, 8).map((c) => <CreatorCard key={c.id} creator={c} />)}
                        </div>
                    </Section>
                )}

                {/* New Creators */}
                {newCreators.length > 0 && (
                    <Section icon={Sparkles} title="New Creators" color="text-purple-400">
                        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
                            {newCreators.map((c) => <CreatorCard key={c.id} creator={c} />)}
                        </div>
                    </Section>
                )}

                {/* Tags / Categories */}
                {tags.length > 0 && (
                    <Section icon={Hash} title="Categories">
                        <div className="flex flex-wrap gap-3">
                            <button onClick={() => setActiveTag(null)}
                                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                                    !activeTag ? 'bg-gold text-black font-medium' : 'bg-white/5 text-white/70 hover:text-white border border-white/10'
                                }`}>
                                All
                            </button>
                            {tags.map((t) => (
                                <button key={t.name} onClick={() => setActiveTag(t.name)}
                                    className={`px-4 py-2 rounded-full text-sm transition-colors ${
                                        activeTag === t.name ? 'bg-gold text-black font-medium' : 'bg-white/5 text-white/70 hover:text-white border border-white/10'
                                    }`}>
                                    {t.name} <span className="text-xs opacity-60">({t.count})</span>
                                </button>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Content Grid */}
                <Section icon={Sparkles} title={activeTag ? `Content: ${activeTag}` : 'Latest Content'}>
                    {content.length > 0 ? (
                        <>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {content.map((item) => (
                                    <Link key={item.id} to={`/creator/${item.creator_id}`}
                                        className="card-luxury overflow-hidden group">
                                        {item.media_urls?.length > 0 ? (
                                            <div className="aspect-video relative overflow-hidden">
                                                <img src={mediaUrl(item.media_urls[0])} alt={item.title || ''}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            </div>
                                        ) : (
                                            <div className="aspect-video bg-gradient-to-br from-gold/10 to-transparent flex items-center justify-center">
                                                <Image className="w-10 h-10 text-gold/30" />
                                            </div>
                                        )}
                                        <div className="p-4">
                                            {item.title && <h3 className="text-white font-medium mb-1 truncate">{item.title}</h3>}
                                            {item.text && <p className="text-white/50 text-sm line-clamp-2">{item.text}</p>}
                                            <div className="flex items-center gap-2 mt-3">
                                                <span className="text-gold text-xs">{item.creator_display_name}</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            {hasMore && (
                                <div className="flex justify-center mt-8">
                                    <button onClick={loadMore} disabled={loadingMore}
                                        className="gold-btn px-8 py-3 flex items-center gap-2">
                                        {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        Load More
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-white/50">No public content yet</p>
                        </div>
                    )}
                </Section>
            </main>
        </div>
    );
};

export default DiscoverPage;
