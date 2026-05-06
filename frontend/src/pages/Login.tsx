import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { Terminal, Lock, Mail, User, Building2, Eye, EyeOff, ChevronRight } from 'lucide-react';
import api from '../services/api';

type Mode = 'login' | 'signup';

export default function Login() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { profile, user, loginComplete } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'super_admin') navigate('/admin/dashboard', { replace: true });
      else if (profile.role === 'tenant_admin') navigate('/tenant/dashboard', { replace: true });
      else {
        supabase.auth.signOut();
        setError('End users are not permitted on this platform.');
      }
    }
  }, [user, profile, navigate]);

  if (profile) {
    if (profile.role === 'super_admin') return <Navigate to="/admin/dashboard" replace />;
    if (profile.role === 'tenant_admin') return <Navigate to="/tenant/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    console.log('[LOGIN] Starting login');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        console.log('[LOGIN] Login success — calling loginComplete');
        await loginComplete(data.session);
        // Do not set loading to false here, the component will unmount/navigate
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/tenant/signup', {
        email, password, full_name: fullName, company_name: companyName,
      });

      if (res.data.session) {
        const { data: signInData } = await supabase.auth.setSession({
          access_token: res.data.session.access_token,
          refresh_token: res.data.session.refresh_token,
        });
        if (signInData.session) {
          localStorage.setItem('sb-access-token', signInData.session.access_token);
        }
      }

      setSuccess(`Account created! Your API key: ${res.data.api_key} — Save it, it won't appear again.`);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-sky-500/20 border border-sky-500/30 rounded-2xl flex items-center justify-center">
              <Terminal className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">EntitleX</h1>
              <p className="text-xs text-sky-400 font-medium">API-First Entitlement Platform</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                mode === 'login'
                  ? 'text-sky-400 border-b-2 border-sky-400 bg-sky-500/5'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                mode === 'signup'
                  ? 'text-sky-400 border-b-2 border-sky-400 bg-sky-500/5'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Register Tenant
            </button>
          </div>

          <div className="p-8">
            <p className="text-slate-400 text-sm mb-6 text-center">
              {mode === 'login'
                ? 'Sign in to manage your API integration'
                : 'Create a new Tenant Admin account'}
            </p>

            {/* Error / Success */}
            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
                <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-sm font-mono break-all">
                <p className="font-semibold text-emerald-400 mb-2 font-sans">✅ Account Created!</p>
                {success}
              </div>
            )}

            <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all text-sm"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Company Name <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all text-sm"
                        placeholder="Acme Corp"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all text-sm"
                    placeholder="developer@company.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all text-sm"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {mode === 'login' && (
              <p className="mt-6 text-center text-xs text-slate-600">
                Super Admin? Your account is provisioned by platform bootstrap.
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-700 mt-6">
          EntitleX — API-first Feature Entitlement Platform
        </p>
      </div>
    </div>
  );
}
