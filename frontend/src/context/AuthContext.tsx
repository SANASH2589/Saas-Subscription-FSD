import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import type { User, Session } from '@supabase/supabase-js';
import api from '../services/api';

interface UserProfile {
  id: string; email: string; full_name: string;
  role: 'super_admin' | 'tenant_admin' | 'end_user';
  tenant_id: string; tenant_name: string; created_at: string;
}

interface Plan {
  id: string; name: string; price: number; interval: string;
  feature_limits: Record<string, number>;
}

interface Subscription {
  id: string; status: string; start_date: string; end_date: string; plan: Plan;
}

interface AuthContextType {
  user: User | null; session: Session | null; profile: UserProfile | null;
  subscription: Subscription | null; loading: boolean;
  refreshProfile: () => Promise<void>; signOut: () => Promise<void>;
  loginComplete: (session: Session) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, profile: null, subscription: null,
  loading: true, refreshProfile: async () => {}, signOut: async () => {}, loginComplete: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  
  const initialized = useRef(false);

  const fetchProfile = async (currentToken: string, currentUser: User) => {
    try {
      const res = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      setProfile(res.data.user);
      setSubscription(res.data.subscription);
      setUser(currentUser);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('sb-access-token');
        setProfile(null); setSubscription(null); setUser(null); setSession(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeAuth = useCallback(async () => {
    if (initialized.current) return;
    initialized.current = true;
    
    setLoading(true);
    const { data: { session: initialSession } } = await supabase.auth.getSession();
    
    if (initialSession?.access_token) {
      localStorage.setItem('sb-access-token', initialSession.access_token);
      setSession(initialSession);
      await fetchProfile(initialSession.access_token, initialSession.user);
    } else {
      localStorage.removeItem('sb-access-token');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
    
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'TOKEN_REFRESHED' && newSession) {
        localStorage.setItem('sb-access-token', newSession.access_token);
        setSession(newSession);
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('sb-access-token');
        setSession(null); setUser(null); setProfile(null); setSubscription(null);
        setLoading(false);
      }
    });

    return () => { authListener.unsubscribe(); };
  }, [initializeAuth]);

  const loginComplete = async (newSession: Session) => {
    setLoading(true);
    localStorage.setItem('sb-access-token', newSession.access_token);
    setSession(newSession);
    await fetchProfile(newSession.access_token, newSession.user);
  };

  const refreshProfile = async () => {
    if (!session) return;
    setLoading(true);
    await fetchProfile(session.access_token, session.user);
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut(); // Triggers SIGNED_OUT event
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, subscription, loading, refreshProfile, signOut, loginComplete }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
