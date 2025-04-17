import { create } from 'zustand';
import { axiosInstance } from '../lib/axios';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

const BASE_URL = import.meta.env.MODE === 'development'
  ? 'http://localhost:5000'
  : 'https://nex-back-recw.onrender.com';

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: false,
  onlineUsers: [],
  socket: null,

  initialize: () => {
    axiosInstance.interceptors.request.use(config => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      config.withCredentials = true; // Keep for cookie fallback
      console.log('Request URL:', config.url, 'Headers:', config.headers);
      return config;
    });

    axiosInstance.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 401 && !['/auth/check', '/auth/login', '/auth/signup'].includes(error.config.url)) {
          console.log('401 error for URL:', error.config.url);
          get().handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  },

  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      const res = await axiosInstance.get('/auth/check');
      console.log('Check auth response:', res.data, 'Headers:', res.headers);
      set({ authUser: res.data, isCheckingAuth: false });
      get().connectSocket();
    } catch (error) {
      console.error('Check auth error:', error.response?.data || error.message);
      set({ authUser: null, isCheckingAuth: false });
    }
  },

  handleUnauthorized: () => {
    const { authUser } = get();
    if (!authUser) return;
    set({ authUser: null });
    localStorage.removeItem('token');
    get().disconnectSocket();
    toast.error('Session expired. Please login again.', { id: 'session-expired' });
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post('/auth/signup', data, {
        withCredentials: true,
      });
      console.log('Signup response:', res.data, 'Headers:', res.headers);
      localStorage.setItem('token', res.data.token);
      set({ authUser: res.data });
      toast.success('Account created successfully');
      await get().checkAuth();
      get().connectSocket();
    } catch (error) {
      console.error('Signup error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Signup failed');
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      console.log('Login full URL:', `${axiosInstance.defaults.baseURL}/auth/login`);
      const res = await axiosInstance.post('/auth/login', data, {
        withCredentials: true,
      });
      console.log('Login response:', res.data, 'Headers:', res.headers, 'Cookies:', document.cookie);
      localStorage.setItem('token', res.data.token);
      set({ authUser: res.data });
      toast.success('Logged in successfully');
      await get().checkAuth();
      get().connectSocket();
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post('/auth/logout', {}, {
        withCredentials: true,
      });
      localStorage.removeItem('token');
      get().handleUnauthorized();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Logout failed');
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const isProduction = import.meta.env.MODE === 'production';
    const token = localStorage.getItem('token');

    const socket = io(BASE_URL, {
      withCredentials: true,
      secure: isProduction,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      query: {
        userId: authUser._id,
      },
      extraHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      if (err.message.includes('Authentication')) {
        toast.error('Socket authentication failed');
      }
    });

    socket.on('getOnlineUsers', (userIds) => {
      set({ onlineUsers: userIds });
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
    }
    set({ socket: null, onlineUsers: [] });
  },
}));