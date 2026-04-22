import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lock, Mail, User, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

const UserLogin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Support for ?tenant=slug
  useEffect(() => {
    const slug = searchParams.get('tenant');
    if (slug) {
      setTenantSlug(slug);
      setIsLogin(false);
    }
  }, [searchParams]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { data } = await api.post('/auth/user/login', { email, password });
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

        navigate('/user/dashboard');
      } else {
        if (!tenantSlug.trim()) {
          setError('Company Code (Tenant Slug) is required to join');
          setLoading(false);
          return;
        }

        const { data } = await api.post('/auth/user/signup', {
          email,
          password,
          full_name: fullName,
          tenant_slug: tenantSlug
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

        navigate('/user/dashboard');
      }
    } catch (err: any) {
      console.error('[User Auth Error]:', err);
      const msg = err.response?.data?.error || err.message || 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center">
                  <ShieldCheck size={24} className="text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white">
                {isLogin ? 'User Login' : 'Join Your Company'}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                {isLogin ? 'Access your tools and features' : 'Sign up as an end user'}
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
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Company Code <span className="text-xs text-slate-500">(Ask your admin)</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={tenantSlug}
                        onChange={e => setTenantSlug(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                        placeholder="e.g. acme-corp"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                        placeholder="Jane Doe"
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
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    placeholder="user@company.com"
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
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
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
                className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors duration-200 mt-2"
              >
                {loading ? 'Processing...' : (isLogin ? 'Access Account →' : 'Join Company →')}
              </button>
            </form>

            <p className="text-center text-slate-400 text-sm mt-6">
              {isLogin ? "Need an account? " : 'Already registered? '}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
