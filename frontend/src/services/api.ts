import axios from 'axios';
import { supabase } from '../supabaseClient';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// ── Request Interceptor: Attach JWT ─────────────────────────
api.interceptors.request.use(async (config) => {
  // Skip session check for auth routes to prevent deadlocks
  if (config.url?.includes('/auth/login') || config.url?.includes('/auth/signup')) {
    return config;
  }

  const token = localStorage.getItem('sb-access-token');
  
  if (token) {
    console.log(`[API Interceptor] Attaching token to ${config.url}`);
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn(`[API Interceptor] No token found in localStorage for ${config.url}`);
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// ── Response Interceptor: Handle 401 ────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn('[API] 401 Unauthorized detected. Clearing session.');
      // Session expired — sign out and redirect
      localStorage.removeItem('sb-access-token');
      await supabase.auth.signOut().catch(() => {}); 
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
