import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === 'development'
    ? 'http://localhost:5000/api'
    : 'https://nex-back-recw.onrender.com/api',
  withCredentials: true,
});

export { axiosInstance };