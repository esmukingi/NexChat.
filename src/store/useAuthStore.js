import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from 'socket.io-client';

const BASE_URL = import.meta.env.MODE === "development"
  ? "http://localhost:5000"
  : "https://nex-back-recw.onrender.com";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  // Initialize axios interceptors
  initialize: () => {
    // Request interceptor to add token
    axiosInstance.interceptors.request.use(config => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor to handle 401 errors
    axiosInstance.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          get().handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  },

  handleUnauthorized: () => {
    localStorage.removeItem('token');
    set({ authUser: null });
    get().disconnectSocket();
  },

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      localStorage.setItem('token', res.data.token);
      get().connectSocket();
    } catch (error) {
      get().handleUnauthorized();
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      localStorage.setItem('token', res.data.token);
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      localStorage.setItem('token', res.data.token);
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      get().handleUnauthorized();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;
    
    const socket = io(BASE_URL, {
      auth: {
        token: localStorage.getItem('token')
      },
      query: {
        userId: authUser._id
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'] // Enable both transports
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      // Try to reconnect with fresh token if error is auth-related
      if (err.message.includes('Authentication error')) {
        socket.auth.token = localStorage.getItem('token');
        socket.connect();
      }
    });

    socket.on('getOnlineUsers', (userIds) => {
      set({ onlineUsers: userIds });
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('getOnlineUsers');
      socket.off('disconnect');
      socket.disconnect();
    }
    set({ socket: null, onlineUsers: [] });
  }
}));