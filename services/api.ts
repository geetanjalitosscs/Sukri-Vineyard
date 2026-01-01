import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://103.14.120.163:8087/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

