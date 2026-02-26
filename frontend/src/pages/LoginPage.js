import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Diamond, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [maintenance, setMaintenance] = useState(null);
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetch(`${BACKEND_URL}/api/admin/maintenance`)
            .then(r => r.json())
            .then(data => { if (data.enabled) setMaintenance(data); })
            .catch(() => {});
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Please fill in all fields');
            return;
        }
        
        setLoading(true);
        try {
            await login(email, password);
            toast.success('Welcome back!');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-black" data-testid="login-page">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8 animate-fade-in">
                    <Link to="/" className="inline-flex items-center gap-3 group">
                        <Diamond className="w-12 h-12 text-gold transition-transform group-hover:rotate-12" />
                        <span className="font-heading text-2xl gold-text">KING OF DIAMONDS</span>
                    </Link>
                </div>

                {/* Maintenance Banner */}
                {maintenance && (
                    <div className="mb-6 p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 animate-fade-in">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                            <div>
                                <p className="text-yellow-500 font-semibold text-sm uppercase tracking-wider">Maintenance Mode</p>
                                <p className="text-yellow-500/70 text-sm mt-1">{maintenance.message}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form Card */}
                <div className="card-luxury p-8 animate-fade-in delay-100" data-testid="login-form-container">
                    <h1 className="font-heading text-2xl text-center mb-2 gold-text">Welcome Back</h1>
                    <p className="text-white/50 text-center mb-8 text-sm">Sign in to your account</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-white/70 text-sm uppercase tracking-wider mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-luxury w-full"
                                placeholder="your@email.com"
                                data-testid="login-email"
                                autoComplete="email"
                            />
                        </div>

                        <div>
                            <label className="block text-white/70 text-sm uppercase tracking-wider mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-luxury w-full pr-12"
                                    placeholder="••••••••"
                                    data-testid="login-password"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-gold transition-colors"
                                    data-testid="toggle-password"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="gold-btn w-full py-4 flex items-center justify-center gap-2 disabled:opacity-50"
                            data-testid="login-submit"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Signing In...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <p className="text-center mt-8 text-white/50">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-gold hover:text-gold-light transition-colors" data-testid="register-link">
                            Create one
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
