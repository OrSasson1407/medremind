import axios from 'axios';
import { useAuthStore } from './store/authStore';

// Supports Vite environment variables for deployment
const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Auth token injection ────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Dynamically grab the token from Zustand state
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Global 401 Handling ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid -> Clear state
      useAuthStore.getState().logout();
      
      // Redirect to login to prevent broken state
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth Endpoints & Types ──────────────────────────────────────────────────

export interface RegisterPayload {
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginPayload {
  username: string; // FastAPI OAuth2 form requires "username"
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export const register = async (payload: RegisterPayload) => {
  const { data } = await api.post('/auth/register', payload);
  return data;
};

export const login = async (payload: LoginPayload): Promise<Token> => {
  const form = new URLSearchParams();
  form.append('username', payload.username);
  form.append('password', payload.password);
  
  const { data } = await api.post('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return data;
};

export const fetchCurrentUser = async () => {
  const { data } = await api.get('/auth/me');
  return data;
};