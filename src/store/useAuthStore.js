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

  initialize: () => {
    axiosInstance.interceptors.request.use(config => {
      config.withCredentials = true;
      return config;
    });
  
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
  
  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check"); // Note /api prefix
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      get().handleUnauthorized();
    }
  },
  handleUnauthorized: () => {
    set({ authUser: null });
    get().disconnectSocket();
    toast.error("Session expired. Please login again.");
  },
  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data, {
        withCredentials: true
      });
      set({ authUser: res.data });
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
      const res = await axiosInstance.post("/auth/login", data, {
        withCredentials: true
      });
      set({ authUser: res.data });
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
      await axiosInstance.post("/auth/logout", {}, {
        withCredentials: true
      });
      get().handleUnauthorized();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;
    
    const isProduction = import.meta.env.MODE === "production";
    
    const socket = io(BASE_URL, {
      withCredentials: true,
      secure: isProduction,
      transports: ['websocket'],
      auth: {
        token: localStorage.getItem('token') // Fallback
      },
      query: {
        userId: authUser._id
      }
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      if (err.message.includes('Authentication error')) {
        socket.connect();
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
  }
}));