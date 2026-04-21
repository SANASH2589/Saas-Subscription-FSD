import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lock, Mail, User, Building2, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

const LoginPage: React.FC = () => {
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

    console.log('[Auth] --- Debug Info ---');
    console.log('[Auth] API_URL:', import.meta.env.VITE_API_URL);
    console.log('[Auth] SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('[Auth] Current State:', { email, isLogin });

    try {
      if (isLogin) {
        const fullUrl = `${api.defaults.baseURL}/auth/login`;
        console.log(`[Auth] POST Request to: ${fullUrl}`);
        
        const { data } = await api.post('/auth/login', { email, password });
        console.log('[Auth] Backend raw response:', data);

        if (!data.session) {
          throw new Error('Authentication succeeded but no session was returned.');
        }

        console.log('[Auth] Storing access_token in localStorage...');
        localStorage.setItem('sb-access-token', data.session.access_token);

        console.log('[Auth] Syncing Supabase session...');
        try {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          });
          if (sessionError) throw sessionError;
          console.log('[Auth] Supabase session sync successful.');
        } catch (syncErr) {
          console.warn('[Auth] Supabase setSession failed, but proceeding since localStorage is set:', syncErr);
        }

        console.log('[Auth] Session synced. Redirecting based on role:', data.user.role);
        if (data.user.role === 'tenant_admin' || data.user.role === 'super_admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/user/dashboard');
        }
      } else {
        console.log('[Auth] Calling backend /auth/signup...');
        if (!companyName.trim()) {
          setError('Company name is required');
          setLoading(false);
          return;
        }

        const { data } = await api.post('/auth/signup', {
          email,
          password,
          full_name: fullName,
          company_name: companyName
        });
        console.log('[Auth] Signup successful:', data);

        console.log('[Auth] Storing access_token in localStorage...');
        localStorage.setItem('sb-access-token', data.session.access_token);

        console.log('[Auth] Syncing Supabase session...');
        try {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          });
          console.log('[Auth] Supabase session sync successful.');
        } catch (syncErr) {
          console.warn('[Auth] Signup setSession failed:', syncErr);
        }

        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      console.error('[Auth Error]:', err);
      const msg = err.response?.data?.error || err.message || 'Something went wrong';
      setError(msg);
    } finally {
      console.log('[Auth] Process finished. Resetting loading state.');
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
            <span className="text-2xl font-bold tracking-tight">EntitleX</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight mb-4">
            Feature Access,<br />Intelligently Managed.
          </h1>
          <p className="text-slate-400 text-lg mb-10">
            Manage subscriptions, enforce usage limits, and grow revenue — all from one unified platform.
          </p>
          <div className="space-y-4">
            {[
              { icon: '✦', text: 'Role-based access for your entire team' },
              { icon: '✦', text: 'Real-time entitlement checks at scale' },
              { icon: '✦', text: 'AI-powered plan upgrade suggestions' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-300">
                <span className="text-indigo-400 font-bold">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-2 lg:hidden">
                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                  <Building2 size={16} className="text-white" />
                </div>
                <span className="text-white font-bold text-lg">EntitleX</span>
              </div>
              <h2 className="text-2xl font-bold text-white">
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                {isLogin ? 'Sign in to your workspace' : 'Start your 30-day free trial'}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Form */}
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
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    {isLogin ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : (isLogin ? 'Sign in →' : 'Create account →')}
              </button>
            </form>

            {/* Toggle */}
            <p className="text-center text-slate-400 text-sm mt-6">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                {isLogin ? 'Sign up free' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
