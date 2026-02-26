import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Toaster } from './components/ui/sonner';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ExplorePage from './pages/ExplorePage';
import CreatorProfilePage from './pages/CreatorProfilePage';
import CreatorDashboardPage from './pages/CreatorDashboardPage';
import BecomeCreatorPage from './pages/BecomeCreatorPage';
import MessagesPage from './pages/MessagesPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import LiveStreamPage from './pages/LiveStreamPage';
import LiveStreamsPage from './pages/LiveStreamsPage';
import PPVPage from './pages/PPVPage';
import SearchResultsPage from './pages/SearchResultsPage';
import DiscoverPage from './pages/DiscoverPage';
import AnalyticsDashboard from './pages/AnalyticsDashboard';

// Protected Route Component
const ProtectedRoute = ({ children, requireAuth = true, requireAdmin = false }) => {
    const { isAuthenticated, isAdmin, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }
    
    if (requireAuth && !isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    
    if (requireAdmin && !isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }
    
    return children;
};

// Public Route - redirect to dashboard if already authenticated
const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }
    
    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }
    
    return children;
};

function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/search" element={<SearchResultsPage />} />
            <Route path="/creator/:creatorId" element={<CreatorProfilePage />} />
            <Route path="/live" element={<LiveStreamsPage />} />
            
            {/* Auth Routes - redirect if logged in */}
            <Route 
                path="/login" 
                element={
                    <PublicRoute>
                        <LoginPage />
                    </PublicRoute>
                } 
            />
            <Route 
                path="/register" 
                element={
                    <PublicRoute>
                        <RegisterPage />
                    </PublicRoute>
                } 
            />
            
            {/* Protected Routes */}
            <Route 
                path="/dashboard" 
                element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/feed" 
                element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/become-creator" 
                element={
                    <ProtectedRoute>
                        <BecomeCreatorPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/creator/dashboard" 
                element={
                    <ProtectedRoute>
                        <CreatorDashboardPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/messages" 
                element={
                    <ProtectedRoute>
                        <MessagesPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/ppv" 
                element={
                    <ProtectedRoute>
                        <PPVPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/live/:streamId" 
                element={
                    <ProtectedRoute>
                        <LiveStreamPage />
                    </ProtectedRoute>
                } 
            />
            <Route 
                path="/settings" 
                element={
                    <ProtectedRoute>
                        <SettingsPage />
                    </ProtectedRoute>
                } 
            />
            
            <Route 
                path="/analytics" 
                element={
                    <ProtectedRoute>
                        <AnalyticsDashboard />
                    </ProtectedRoute>
                } 
            />
            
            {/* Admin Routes */}
            <Route 
                path="/admin" 
                element={
                    <ProtectedRoute requireAdmin>
                        <AdminPage />
                    </ProtectedRoute>
                } 
            />
            
            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
            <NotificationProvider>
                <AppRoutes />
                <Toaster 
                    position="top-right"
                    toastOptions={{
                        style: {
                            background: '#0A0A0A',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#fff'
                        }
                    }}
                />
            </NotificationProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
