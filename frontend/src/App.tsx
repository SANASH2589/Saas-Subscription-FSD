import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import DeveloperDashboard from './pages/DeveloperDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import DemoApp from './pages/DemoApp';
import Layout from './components/Layout';

// ── Route Guards ──────────────────────────────────────────────

const SuperAdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white">Loading...</div>;
  if (!user || !profile || profile.role !== 'super_admin') return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const TenantAdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white">Loading...</div>;
  if (!user || !profile || profile.role !== 'tenant_admin') return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Public Demo App — no auth required */}
        <Route path="/demo-app" element={<DemoApp />} />
        <Route path="/demo-app/*" element={<DemoApp />} />

        {/* Super Admin Routes */}
        <Route path="/admin" element={<SuperAdminGuard><Layout type="super_admin" /></SuperAdminGuard>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>

        {/* Tenant Admin (Developer) Routes */}
        <Route path="/tenant" element={<TenantAdminGuard><Layout type="tenant_admin" /></TenantAdminGuard>}>
          <Route index element={<Navigate to="/tenant/dashboard" replace />} />
          <Route path="dashboard" element={<DeveloperDashboard />} />
          <Route path="*" element={<Navigate to="/tenant/dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

