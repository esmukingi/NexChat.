import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development" 
    ? "http://localhost:5000/api" 
    : "https://nex-back-recw.onrender.com/api",
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});
axiosInstance;