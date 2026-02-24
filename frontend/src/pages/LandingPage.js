import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Diamond, Crown, Star, Shield, ArrowRight, Sparkles, Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const LandingPage = () => {
    const { isAuthenticated } = useAuth();
    const [featuredStream, setFeaturedStream] = useState(null);

    useEffect(() => {
        axios.get(`${API}/admin/featured-stream`).then(res => {
            if (res.data.is_active && res.data.stream) {
                setFeaturedStream(res.data.stream);
            }
        }).catch(() => {});
    }, []);

    const features = [
        {
            icon: Crown,
            title: 'Premium Content',
            description: 'Exclusive access to content from top creators worldwide'
        },
        {
            icon: Shield,
            title: 'Secure Platform',
            description: 'Your privacy and security are our top priority'
        },
        {
            icon: Star,
            title: 'Creator Tools',
            description: 'Powerful tools to monetize your content and grow your audience'
        }
    ];

    const creators = [
        {
            name: 'Diamond Elite',
            image: 'https://images.unsplash.com/photo-1611855363188-b25d9f25781e?w=400',
            subscribers: '12.5K'
        },
        {
            name: 'Golden Crown',
            image: 'https://images.unsplash.com/photo-1713812956759-371b4e8fc468?w=400',
            subscribers: '8.2K'
        },
        {
            name: 'Royal Gem',
            image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
            subscribers: '15.1K'
        }
    ];

    return (
        <div className="min-h-screen bg-black" data-testid="landing-page">
            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gold/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[100px]" />
                    <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-diamond/5 rounded-full blur-[80px]" />
                </div>

                {/* Content */}
                <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
                    <div className="text-center">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 border border-gold/30 rounded-full mb-8 animate-fade-in">
                            <Sparkles className="w-4 h-4 text-gold" />
                            <span className="text-gold text-sm uppercase tracking-widest">Exclusive Content Platform</span>
                        </div>

                        {/* Logo */}
                        <div className="flex items-center justify-center gap-4 mb-6 animate-fade-in delay-100">
                            <Diamond className="w-16 h-16 md:w-20 md:h-20 text-gold animate-pulse-gold" />
                        </div>

                        {/* Title */}
                        <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl mb-6 animate-fade-in delay-200">
                            <span className="gold-text">KING OF</span>
                            <br />
                            <span className="text-white">DIAMONDS</span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto mb-12 animate-fade-in delay-300">
                            The premier destination for exclusive content creators. 
                            Join the elite and unlock a world of premium experiences.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in delay-400">
                            {isAuthenticated ? (
                                <Link
                                    to="/dashboard"
                                    className="gold-btn px-10 py-4 text-lg flex items-center gap-3"
                                    data-testid="hero-dashboard-btn"
                                >
                                    Enter Dashboard
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        to="/register"
                                        className="gold-btn px-10 py-4 text-lg flex items-center gap-3"
                                        data-testid="hero-join-btn"
                                    >
                                        Join Now
                                        <ArrowRight className="w-5 h-5" />
                                    </Link>
                                    <Link
                                        to="/explore"
                                        className="btn-secondary px-10 py-4 text-lg"
                                        data-testid="hero-explore-btn"
                                    >
                                        Explore Creators
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                    <div className="w-6 h-10 border-2 border-gold/30 rounded-full flex items-start justify-center p-2">
                        <div className="w-1 h-3 bg-gold rounded-full animate-pulse" />
                    </div>
                </div>
            </section>

            {/* Featured Stream Section */}
            {featuredStream && (
                <section className="py-16 relative border-t border-white/5" data-testid="featured-stream-section">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 px-4 py-2 border border-red-500/30 rounded-full mb-4 animate-pulse">
                                <div className="w-2 h-2 bg-red-500 rounded-full" />
                                <span className="text-red-400 text-sm uppercase tracking-widest">Live Now</span>
                            </div>
                            <h2 className="font-heading text-3xl md:text-4xl mb-2">
                                <span className="gold-text">{featuredStream.title}</span>
                            </h2>
                            {featuredStream.description && (
                                <p className="text-white/50 max-w-xl mx-auto">{featuredStream.description}</p>
                            )}
                        </div>
                        <div className="aspect-video rounded-lg overflow-hidden border border-gold/20 shadow-2xl shadow-gold/10">
                            <iframe
                                src={featuredStream.embed_url}
                                title={featuredStream.title}
                                className="w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                </section>
            )}

            {/* Features Section */}
            <section className="py-24 relative" data-testid="features-section">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="font-heading text-3xl md:text-4xl mb-4">
                            <span className="gold-text">Why Choose</span>
                            <span className="text-white ml-3">King of Diamonds</span>
                        </h2>
                        <p className="text-white/50 max-w-xl mx-auto">
                            Experience the ultimate platform for premium content
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <div
                                key={feature.title}
                                className="card-luxury p-8 text-center group hover:scale-105 transition-transform duration-300"
                                style={{ animationDelay: `${index * 100}ms` }}
                                data-testid={`feature-${index}`}
                            >
                                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                                    <feature.icon className="w-8 h-8 text-gold" />
                                </div>
                                <h3 className="font-heading text-xl text-white mb-3">{feature.title}</h3>
                                <p className="text-white/50 text-sm">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Creators */}
            <section className="py-24 relative border-t border-white/5" data-testid="creators-section">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="font-heading text-3xl md:text-4xl mb-4">
                            <span className="gold-text">Featured</span>
                            <span className="text-white ml-3">Creators</span>
                        </h2>
                        <p className="text-white/50 max-w-xl mx-auto">
                            Discover our most popular content creators
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {creators.map((creator, index) => (
                            <div
                                key={creator.name}
                                className="card-luxury overflow-hidden group cursor-pointer"
                                data-testid={`creator-card-${index}`}
                            >
                                <div className="aspect-[3/4] relative overflow-hidden">
                                    <img
                                        src={creator.image}
                                        alt={creator.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-6">
                                        <h3 className="font-heading text-xl text-white mb-1">{creator.name}</h3>
                                        <p className="text-gold text-sm">{creator.subscribers} subscribers</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-12">
                        <Link
                            to="/explore"
                            className="btn-secondary inline-flex items-center gap-2"
                            data-testid="view-all-creators"
                        >
                            View All Creators
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 relative border-t border-white/5" data-testid="cta-section">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gold/5 to-transparent" />
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <Diamond className="w-16 h-16 text-gold mx-auto mb-8" />
                    <h2 className="font-heading text-3xl md:text-5xl mb-6">
                        <span className="gold-text">Ready to Join</span>
                        <span className="text-white block mt-2">the Elite?</span>
                    </h2>
                    <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">
                        Create your account today and start your journey with exclusive content and premium experiences.
                    </p>
                    {!isAuthenticated && (
                        <Link
                            to="/register"
                            className="gold-btn px-12 py-4 text-lg inline-flex items-center gap-3"
                            data-testid="cta-join-btn"
                        >
                            Get Started
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-white/10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <Diamond className="w-8 h-8 text-gold" />
                            <span className="font-heading text-lg gold-text">KING OF DIAMONDS</span>
                        </div>
                        <p className="text-white/30 text-sm">
                            © 2025 King of Diamonds. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
