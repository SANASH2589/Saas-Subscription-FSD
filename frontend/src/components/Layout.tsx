import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, List, LogOut, Key, BarChart3, BookOpen, Users, Terminal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface LayoutProps {
  type: 'super_admin' | 'tenant_admin';
}

const Layout: React.FC<LayoutProps> = ({ type }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { success } = useToast();

  const handleLogout = async () => {
    await signOut();
    success('Logged out successfully');
    navigate('/login');
  };

  const superAdminNav = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Tenants', path: '/admin/tenants', icon: Users },
    { name: 'Plans', path: '/admin/plans', icon: Package },
    { name: 'Features', path: '/admin/features', icon: List },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  ];

  const tenantAdminNav = [
    { name: 'Dashboard', path: '/tenant/dashboard', icon: LayoutDashboard },
    { name: 'API Keys', path: '/tenant/api-keys', icon: Key },
    { name: 'Plans', path: '/tenant/plans', icon: Package },
    { name: 'Features', path: '/tenant/features', icon: List },
    { name: 'Subscriptions', path: '/tenant/subscriptions', icon: Users },
    { name: 'Usage', path: '/tenant/usage', icon: BarChart3 },
    { name: 'API Docs', path: '/tenant/docs', icon: BookOpen },
  ];

  const navItems = type === 'super_admin' ? superAdminNav : tenantAdminNav;

  return (
    <div className="flex h-screen bg-slate-900 text-slate-300 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col transition-all">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Terminal size={18} />
            </div>
            <span className="text-lg font-bold text-white tracking-wide">
              EntitleX
            </span>
          </div>
        </div>

        {type === 'tenant_admin' && (
          <div className="p-5 border-b border-slate-800">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Developer Workspace</div>
            <div className="text-sm font-medium text-white truncate">{profile?.tenant_name || 'Loading...'}</div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-sky-500/10 text-sky-400 font-medium' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span className="text-sm">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-medium text-white border border-slate-700">
              {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{profile?.full_name || 'Developer'}</div>
              <div className="text-xs text-slate-500 truncate">{profile?.email}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#0B1120]">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
