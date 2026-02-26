import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Crown, Users, Search, Loader2, Hash, Image, CheckCircle } from 'lucide-react';
import axios from 'axios';

import { mediaUrl } from '../lib/media';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TABS = [
    { key: 'all', label: 'All' },
    { key: 'creators', label: 'Creators' },
    { key: 'content', label: 'Content' },
    { key: 'tags', label: 'Tags' },
];

export const SearchResultsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const activeTab = searchParams.get('tab') || 'all';
    const [results, setResults] = useState({ creators: [], content: [], tags: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!query) return;
        const fetchResults = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${API}/search/`, { params: { q: query, tab: activeTab } });
                setResults(res.data);
            } catch (err) {
                console.error('Search failed:', err);
            }
            setLoading(false);
        };
        fetchResults();
    }, [query, activeTab]);

    const setTab = (tab) => {
        setSearchParams({ q: query, tab });
    };

    return (
        <div className="min-h-screen bg-black">
            <Navbar />
            <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <h1 className="font-heading text-3xl mb-2">
                    <span className="text-white">Results for </span>
                    <span className="gold-text">"{query}"</span>
                </h1>

                {/* Tabs */}
                <div className="flex gap-1 mb-8 border-b border-white/10">
                    {TABS.map((tab) => (
                        <button key={tab.key} onClick={() => setTab(tab.key)}
                            className={`px-4 py-3 text-sm uppercase tracking-wider transition-colors ${
                                activeTab === tab.key
                                    ? 'text-gold border-b-2 border-gold'
                                    : 'text-white/50 hover:text-white'
                            }`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 text-gold animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-10">
                        {/* Creators */}
                        {(activeTab === 'all' || activeTab === 'creators') && results.creators?.length > 0 && (
                            <section>
                                {activeTab === 'all' && <h2 className="font-heading text-xl text-white mb-4">Creators</h2>}
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {results.creators.map((creator) => (
                                        <Link key={creator.id} to={`/creator/${creator.id}`}
                                            className="card-luxury overflow-hidden group">
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
                                                <div className="absolute bottom-0 left-0 right-0 p-5">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h3 className="font-heading text-lg text-white">{creator.display_name}</h3>
                                                        {creator.is_verified && <CheckCircle className="w-4 h-4 text-gold" />}
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-white/50 text-sm flex items-center gap-1">
                                                            <Users className="w-4 h-4" />{creator.subscriber_count} subs
                                                        </span>
                                                        <span className="gold-text font-medium">${creator.subscription_price}/mo</span>
                                                    </div>
                                                    {creator.tags?.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {creator.tags.slice(0, 3).map((tag) => (
                                                                <span key={tag} className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded-full">{tag}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Content */}
                        {(activeTab === 'all' || activeTab === 'content') && results.content?.length > 0 && (
                            <section>
                                {activeTab === 'all' && <h2 className="font-heading text-xl text-white mb-4">Content</h2>}
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {results.content.map((item) => (
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
                                                    <span className="text-white/30 text-xs">• {item.like_count || 0} likes</span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Tags */}
                        {(activeTab === 'all' || activeTab === 'tags') && results.tags?.length > 0 && (
                            <section>
                                {activeTab === 'all' && <h2 className="font-heading text-xl text-white mb-4">Tags</h2>}
                                <div className="flex flex-wrap gap-3">
                                    {results.tags.map((tag) => (
                                        <Link key={tag} to={`/discover?tag=${encodeURIComponent(tag)}`}
                                            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:border-gold/50 transition-colors">
                                            <Hash className="w-4 h-4 text-gold" />
                                            <span className="text-white text-sm">{tag}</span>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* No results */}
                        {!loading && !results.creators?.length && !results.content?.length && !results.tags?.length && (
                            <div className="text-center py-20">
                                <Search className="w-16 h-16 text-gold/30 mx-auto mb-4" />
                                <h3 className="font-heading text-xl text-white mb-2">No Results Found</h3>
                                <p className="text-white/50">Try a different search term</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default SearchResultsPage;
