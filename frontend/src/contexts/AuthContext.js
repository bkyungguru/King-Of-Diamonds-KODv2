import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('kod_token'));
    const [loading, setLoading] = useState(true);
    const [creatorProfile, setCreatorProfile] = useState(null);

    const api = useCallback(() => {
        return axios.create({
            baseURL: API,
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
    }, [token]);

    const fetchUser = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const response = await api().get('/users/me');
            setUser(response.data);
            
            // Fetch creator profile if user is a creator, admin, or superadmin
            if (response.data.role === 'creator' || response.data.role === 'admin' || response.data.role === 'superadmin') {
                try {
                    const creatorRes = await api().get('/creators/me');
                    setCreatorProfile(creatorRes.data);
                } catch (e) {
                    // Creator profile doesn't exist yet - that's ok, will be created when going live
                    setCreatorProfile(null);
                }
            } else {
                setCreatorProfile(null);
            }
        } catch (error) {
            console.error('Failed to fetch user:', error);
            logout();
        } finally {
            setLoading(false);
        }
    }, [token, api]);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const login = async (email, password) => {
        const response = await api().post('/auth/login', { email, password });
        const { token: newToken, user: userData } = response.data;
        localStorage.setItem('kod_token', newToken);
        setToken(newToken);
        setUser(userData);
        return userData;
    };

    const register = async (email, password, username, displayName) => {
        const response = await api().post('/auth/register', {
            email,
            password,
            username,
            display_name: displayName
        });
        const { token: newToken, user: userData } = response.data;
        localStorage.setItem('kod_token', newToken);
        setToken(newToken);
        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('kod_token');
        setToken(null);
        setUser(null);
        setCreatorProfile(null);
    };

    const becomeCreator = async (displayName, bio, subscriptionPrice, tags) => {
        const response = await api().post('/creators/become', {
            display_name: displayName,
            bio,
            subscription_price: subscriptionPrice,
            tags
        });
        setCreatorProfile(response.data);
        setUser(prev => ({ ...prev, role: 'creator' }));
        return response.data;
    };

    const updateUser = async (data) => {
        const response = await api().put('/users/me', data);
        setUser(response.data);
        return response.data;
    };

    const updateCreator = async (data) => {
        const response = await api().put('/creators/me', data);
        setCreatorProfile(response.data);
        return response.data;
    };

    const value = {
        user,
        token,
        loading,
        creatorProfile,
        isAuthenticated: !!user,
        isCreator: user?.role === 'creator' || user?.role === 'admin' || user?.role === 'superadmin',
        canGoLive: user?.role === 'creator' || user?.role === 'admin' || user?.role === 'superadmin',
        isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
        isSuperAdmin: user?.role === 'superadmin',
        login,
        register,
        logout,
        becomeCreator,
        updateUser,
        updateCreator,
        refreshUser: fetchUser,
        api
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
