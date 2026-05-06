import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 5000, // 5 second timeout
});

// ── Request Interceptor: Attach JWT ──────────────────────────
api.interceptors.request.use(async (config) => {
  // Skip for auth routes — no token needed and prevents loops
  const skipUrls = ['/auth/login', '/auth/signup', '/auth/admin/', '/auth/tenant/'];
  if (skipUrls.some(u => config.url?.includes(u))) {
    return config;
  }

  // Read token from localStorage only — never call supabase.auth.getSession() here
  // (that would cause recursive calls if /auth/me itself triggers this interceptor)
  const token = localStorage.getItem('sb-access-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}, (error) => Promise.reject(error));

// ── Response Interceptor: Handle 401 ──────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('[API] 401 received — clearing token and redirecting to login');
      localStorage.removeItem('sb-access-token');
      // Don't call supabase.auth.signOut() here — it can cause loops
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
export { BASE_URL };
