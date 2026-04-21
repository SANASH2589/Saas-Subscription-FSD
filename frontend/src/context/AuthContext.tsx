import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import type { User, Session } from '@supabase/supabase-js'
import api from '../services/api'

// ── Types ────────────────────────────────────────────────────

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: 'super_admin' | 'tenant_admin' | 'end_user'
  tenant_id: string
  tenant_name: string
  created_at: string
}

interface Plan {
  id: string
  name: string
  description: string
  price: number
  interval: string
  feature_limits: Record<string, number>
}

interface Subscription {
  id: string
  status: string
  start_date: string
  end_date: string
  plan: Plan
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  subscription: Subscription | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

// ── Context ───────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  subscription: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {}
})

// ── Provider ──────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('sb-access-token');
    if (!token) {
      console.warn('[AuthContext] No token found in localStorage. Skipping profile fetch.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('[AuthContext] Fetching profile from /auth/me...');
      const res = await api.get('/auth/me');
      console.log('[AuthContext] Profile result:', res.data);
      setProfile(res.data.user);
      setSubscription(res.data.subscription);
    } catch (err) {
      console.error('[AuthContext] Profile fetch failed:', err);
      // If 401, clear local storage
      localStorage.removeItem('sb-access-token');
      setProfile(null);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile()
  }, [user, fetchProfile])

  const signOut = useCallback(async () => {
    console.log('[Auth] Signing out. Clearing everything.');
    await supabase.auth.signOut()
    localStorage.removeItem('sb-access-token');
    setUser(null)
    setSession(null)
    setProfile(null)
    setSubscription(null)
  }, [])

  useEffect(() => {
    let mounted = true;

    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        setSession(session);
        setUser(session.user);
        fetchProfile();
      } else {
        setLoading(false);
      }
    });

    // 2. Auth State Listener
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_IN' && session) {
          setSession(session);
          setUser(session.user);
          await fetchProfile();
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setSubscription(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.unsubscribe();
    };
  }, [fetchProfile]);

  return (
    <AuthContext.Provider value={{ user, session, profile, subscription, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
