import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import UserLogin from './pages/UserLogin';
import TenantLogin from './pages/TenantLogin';
import AdminLogin from './pages/AdminLogin';
import UserDashboard from './pages/UserDashboard'; 
import AdminDashboard from './pages/AdminDashboard';
import PlansPage from './pages/PlansPage';
import FeaturesPage from './pages/FeaturesPage';
import Layout from './components/Layout';
import { Building2, User, ShieldAlert } from 'lucide-react';

const AuthSelection = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-3xl w-full text-center">
        <h1 className="text-4xl font-bold text-white mb-8">Welcome to EntitleX</h1>
        <div className="grid md:grid-cols-3 gap-6">
          <Link to="/user/login" className="bg-white/5 border border-white/10 hover:border-sky-500/50 p-6 rounded-2xl transition-all duration-300 flex flex-col items-center group">
            <div className="w-16 h-16 bg-sky-500/20 text-sky-400 group-hover:bg-sky-500 group-hover:text-white rounded-2xl flex items-center justify-center mb-4 transition-colors">
              <User size={32} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">End User</h3>
            <p className="text-sm text-slate-400">Join your company workspace and access features.</p>
          </Link>

          <Link to="/tenant/login" className="bg-white/5 border border-white/10 hover:border-indigo-500/50 p-6 rounded-2xl transition-all duration-300 flex flex-col items-center group">
            <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white rounded-2xl flex items-center justify-center mb-4 transition-colors">
              <Building2 size={32} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Workspace Admin</h3>
            <p className="text-sm text-slate-400">Manage your company's SaaS usage and plans.</p>
          </Link>

          <Link to="/admin/login" className="bg-white/5 border border-white/10 hover:border-red-500/50 p-6 rounded-2xl transition-all duration-300 flex flex-col items-center group">
             <div className="w-16 h-16 bg-red-500/20 text-red-500 group-hover:bg-red-600 group-hover:text-white rounded-2xl flex items-center justify-center mb-4 transition-colors">
              <ShieldAlert size={32} />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Super Admin</h3>
            <p className="text-sm text-slate-400">Platform owner controls.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Route Guards ──────────────────────────────────────────────

const UserGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white">Loading...</div>;
  if (!user || !profile) return <Navigate to="/user/login" />;
  return <>{children}</>;
};

const AdminGuard = ({ children, requireRole }: { children: React.ReactNode, requireRole?: 'super_admin' }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white">Loading...</div>;
  
  if (!user || !profile) return <Navigate to="/tenant/login" />;
  
  if (requireRole === 'super_admin' && profile.role !== 'super_admin') {
    return <Navigate to="/user/dashboard" />;
  }

  if (profile.role !== 'tenant_admin' && profile.role !== 'super_admin') {
    return <Navigate to="/user/dashboard" />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthSelection />} />
        
        {/* Auth Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/tenant/login" element={<TenantLogin />} />
        <Route path="/user/login" element={<UserLogin />} />
        
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

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
