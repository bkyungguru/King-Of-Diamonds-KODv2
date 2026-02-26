import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Crown, Hash, Loader2 } from 'lucide-react';
import axios from 'axios';

import { mediaUrl } from '../lib/media';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const SearchBar = () => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState({ creators: [], tags: [] });
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const ref = useRef(null);
    const debounceRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setShowDropdown(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!query.trim()) {
            setSuggestions({ creators: [], tags: [] });
            setShowDropdown(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await axios.get(`${API}/search/autocomplete`, { params: { q: query } });
                setSuggestions(res.data);
                setShowDropdown(true);
            } catch { }
            setLoading(false);
        }, 250);
    }, [query]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query.trim())}`);
            setShowDropdown(false);
        }
    };

    const hasSuggestions = suggestions.creators.length > 0 || suggestions.tags.length > 0;

    return (
        <div ref={ref} className="relative w-full max-w-md">
            <form onSubmit={handleSubmit} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => hasSuggestions && setShowDropdown(true)}
                    placeholder="Search creators, content, tags..."
                    className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-10 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-gold/50 transition-colors"
                />
                {query && (
                    <button type="button" onClick={() => { setQuery(''); setShowDropdown(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                )}
                {loading && (
                    <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-gold animate-spin" />
                )}
            </form>

            {showDropdown && hasSuggestions && (
                <div className="absolute top-full mt-2 w-full bg-obsidian border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50">
                    {suggestions.creators.length > 0 && (
                        <div>
                            <div className="px-3 py-2 text-xs uppercase tracking-wider text-white/40">Creators</div>
                            {suggestions.creators.map((c) => (
                                <button key={c.id}
                                    onClick={() => { navigate(`/creator/${c.id}`); setShowDropdown(false); setQuery(''); }}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left">
                                    {c.profile_image_url ? (
                                        <img src={mediaUrl(c.profile_image_url)} alt="" className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                                            <Crown className="w-4 h-4 text-gold" />
                                        </div>
                                    )}
                                    <span className="text-white text-sm">{c.display_name}</span>
                                    {c.is_verified && <span className="text-gold text-xs">✓</span>}
                                </button>
                            ))}
                        </div>
                    )}
                    {suggestions.tags.length > 0 && (
                        <div>
                            <div className="px-3 py-2 text-xs uppercase tracking-wider text-white/40 border-t border-white/10">Tags</div>
                            {suggestions.tags.map((tag) => (
                                <button key={tag}
                                    onClick={() => { navigate(`/search?q=${encodeURIComponent(tag)}&tab=tags`); setShowDropdown(false); setQuery(''); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left">
                                    <Hash className="w-4 h-4 text-gold/60" />
                                    <span className="text-white text-sm">{tag}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <button onClick={handleSubmit}
                        className="w-full px-3 py-2 text-sm text-gold hover:bg-white/5 border-t border-white/10 text-left">
                        Search for "{query}"
                    </button>
                </div>
            )}
        </div>
    );
};

export default SearchBar;
