import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import UserDashboard from './pages/UserDashboard'; 
import AdminDashboard from './pages/AdminDashboard';
import PlansPage from './pages/PlansPage';
import FeaturesPage from './pages/FeaturesPage';
import Layout from './components/Layout';

// ── Route Guards ──────────────────────────────────────────────

const UserGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!user || !profile) return <Navigate to="/login" />;
  return <>{children}</>;
};

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!user || !profile) return <Navigate to="/login" />;
  if (profile.role !== 'tenant_admin' && profile.role !== 'super_admin') {
    return <Navigate to="/user/dashboard" />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* User Routes */}
        <Route path="/user" element={<UserGuard><Layout type="user" /></UserGuard>}>
          <Route index element={<Navigate to="/user/dashboard" />} />
          <Route path="dashboard" element={<UserDashboard />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminGuard><Layout type="admin" /></AdminGuard>}>
          <Route index element={<Navigate to="/admin/dashboard" />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="features" element={<FeaturesPage />} />
          <Route path="users" element={<div className="p-6">Users Management (Coming Soon)</div>} />
        </Route>

        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}
