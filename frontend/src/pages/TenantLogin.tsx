import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lock, Mail, User, Building2, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

const TenantLogin: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { data } = await api.post('/auth/tenant/login', { email, password });
        if (!data.session) throw new Error('Authentication succeeded but no session was returned.');

        localStorage.setItem('sb-access-token', data.session.access_token);
        
        try {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          });
        } catch (syncErr) {
          console.warn('[Auth] Supabase setSession failed:', syncErr);
        }

        navigate('/admin/dashboard'); // Tenant Admins use the "admin" dashboard for their own tenant
      } else {
        if (!companyName.trim()) {
          setError('Company name is required');
          setLoading(false);
          return;
        }

        const { data } = await api.post('/auth/tenant/signup', {
          email,
          password,
          full_name: fullName,
          company_name: companyName
        });

        localStorage.setItem('sb-access-token', data.session.access_token);
        
        try {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          });
        } catch (syncErr) {
          console.warn('[Auth] Signup setSession failed:', syncErr);
        }

        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      console.error('[Tenant Auth Error]:', err);
      const msg = err.response?.data?.error || err.message || 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center px-12 text-white">
        <div className="max-w-md">
           <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
              <Building2 size={22} className="text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">EntitleX Workspace</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight mb-4">
            Manage your company's <br /> SaaS subscriptions.
          </h1>
          <p className="text-slate-400 text-lg mb-10">
            Create a tenant, assign plans, and oversee usage limits.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white">
                {isLogin ? 'Workspace Login' : 'Create Workspace'}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                {isLogin ? 'Sign in to manage your company' : 'Start your free workspace'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Company Name <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Acme Corp"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors duration-200 mt-2"
              >
                {loading ? 'Processing...' : (isLogin ? 'Sign in →' : 'Create workspace →')}
              </button>
            </form>

            <p className="text-center text-slate-400 text-sm mt-6">
              {isLogin ? "Don't have a workspace? " : 'Workspace already exists? '}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                {isLogin ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantLogin;
