import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Diamond, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email || !password) {
            toast.error('Email and password are required');
            return;
        }
        
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        
        setLoading(true);
        try {
            await register(email, password, username || null, displayName || null);
            toast.success('Welcome to King of Diamonds!');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-black" data-testid="register-page">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8 animate-fade-in">
                    <Link to="/" className="inline-flex items-center gap-3 group">
                        <Diamond className="w-12 h-12 text-gold transition-transform group-hover:rotate-12" />
                        <span className="font-heading text-2xl gold-text">KING OF DIAMONDS</span>
                    </Link>
                </div>

                {/* Form Card */}
                <div className="card-luxury p-8 animate-fade-in delay-100" data-testid="register-form-container">
                    <h1 className="font-heading text-2xl text-center mb-2 gold-text">Join the Elite</h1>
                    <p className="text-white/50 text-center mb-8 text-sm">Create your exclusive account</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-white/70 text-sm uppercase tracking-wider mb-2">
                                Email *
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-luxury w-full"
                                placeholder="your@email.com"
                                data-testid="register-email"
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-white/70 text-sm uppercase tracking-wider mb-2">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="input-luxury w-full"
                                    placeholder="@username"
                                    data-testid="register-username"
                                />
                            </div>
                            <div>
                                <label className="block text-white/70 text-sm uppercase tracking-wider mb-2">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="input-luxury w-full"
                                    placeholder="Your Name"
                                    data-testid="register-displayname"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-white/70 text-sm uppercase tracking-wider mb-2">
                                Password *
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-luxury w-full pr-12"
                                    placeholder="••••••••"
                                    data-testid="register-password"
                                    autoComplete="new-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-gold transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-white/70 text-sm uppercase tracking-wider mb-2">
                                Confirm Password *
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="input-luxury w-full"
                                placeholder="••••••••"
                                data-testid="register-confirm-password"
                                autoComplete="new-password"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="gold-btn w-full py-4 flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
                            data-testid="register-submit"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Creating Account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    <p className="text-center mt-8 text-white/50 text-sm">
                        Already have an account?{' '}
                        <Link to="/login" className="text-gold hover:text-gold-light transition-colors" data-testid="login-link">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
