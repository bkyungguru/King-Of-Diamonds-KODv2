import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { Crown, Loader2, DollarSign, Tag } from 'lucide-react';
import { toast } from 'sonner';

export const BecomeCreatorPage = () => {
    const { becomeCreator, isCreator } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        displayName: '',
        bio: '',
        subscriptionPrice: 9.99,
        tags: ''
    });

    React.useEffect(() => {
        if (isCreator) {
            navigate('/creator/dashboard');
        }
    }, [isCreator, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.displayName.trim()) {
            toast.error('Display name is required');
            return;
        }

        setLoading(true);
        try {
            const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
            await becomeCreator(
                formData.displayName,
                formData.bio || null,
                formData.subscriptionPrice,
                tags
            );
            toast.success('Welcome to the creator program!');
            navigate('/creator/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black" data-testid="become-creator-page">
            <Navbar />

            <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gold/20 flex items-center justify-center">
                        <Crown className="w-10 h-10 text-gold" />
                    </div>
                    <h1 className="font-heading text-3xl md:text-4xl mb-4">
                        <span className="gold-text">Become a</span>
                        <span className="text-white ml-3">Creator</span>
                    </h1>
                    <p className="text-white/50 max-w-md mx-auto">
                        Start sharing exclusive content and monetize your audience
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="card-luxury p-8 space-y-6">
                    <div>
                        <label className="block text-white/70 text-sm uppercase tracking-wider mb-2">
                            Display Name *
                        </label>
                        <input
                            type="text"
                            value={formData.displayName}
                            onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                            className="input-luxury w-full"
                            placeholder="Your creator name"
                            data-testid="display-name-input"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-white/70 text-sm uppercase tracking-wider mb-2">
                            Bio
                        </label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                            className="input-luxury w-full h-32 resize-none"
                            placeholder="Tell your fans about yourself..."
                            data-testid="bio-input"
                        />
                    </div>

                    <div>
                        <label className="block text-white/70 text-sm uppercase tracking-wider mb-2">
                            <span className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-gold" />
                                Subscription Price (USD/month)
                            </span>
                        </label>
                        <input
                            type="number"
                            value={formData.subscriptionPrice}
                            onChange={(e) => setFormData(prev => ({ ...prev, subscriptionPrice: parseFloat(e.target.value) || 0 }))}
                            className="input-luxury w-full"
                            min="1"
                            max="100"
                            step="0.01"
                            data-testid="price-input"
                        />
                        <p className="text-white/30 text-sm mt-2">
                            * Payment processing is mocked in this version
                        </p>
                    </div>

                    <div>
                        <label className="block text-white/70 text-sm uppercase tracking-wider mb-2">
                            <span className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-gold" />
                                Tags (comma separated)
                            </span>
                        </label>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                            className="input-luxury w-full"
                            placeholder="lifestyle, fitness, fashion"
                            data-testid="tags-input"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="gold-btn w-full py-4 flex items-center justify-center gap-2"
                        data-testid="submit-btn"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Creating Profile...
                            </>
                        ) : (
                            <>
                                <Crown className="w-5 h-5" />
                                Become a Creator
                            </>
                        )}
                    </button>
                </form>
            </main>
        </div>
    );
};

export default BecomeCreatorPage;
