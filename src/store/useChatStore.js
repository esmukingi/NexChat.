import { create } from 'zustand';
import toast from 'react-hot-toast';
import { axiosInstance } from '../lib/axios';


export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    try {
      const res = await axiosInstance.get('/messages/users', { withCredentials: true });
      set({ users: res.data });
    } catch (error) {
      console.error('Get users error:', error.response?.data);
      if (error.response?.status !== 401) {
        toast.error('Failed to fetch users');
      }
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  subscribeToMessages: (socket) => {
    const { selectedUser } = get();
    if (!selectedUser || !socket) return;
    socket.on("newMessage", (newMessage) => {
      if(newMessage.senderId !== selectedUser._id) return
      set({
        messages: [...get().messages, newMessage],
      });
    });
  },

  unsubscribeFromMessages: (socket) => {
    if (socket) {
      socket.off("newMessage");
    }
  },

  setSelectedUser: (selectedUser) => {
    if (selectedUser !== null && !selectedUser?._id) {
      console.error('Invalid selectedUser:', selectedUser);
      return;
    }
    set({ selectedUser });
  },
}));