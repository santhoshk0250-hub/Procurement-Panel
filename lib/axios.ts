// /lib/axios.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE || "/",
  withCredentials: true,
  timeout: 15000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    try {
      const token = window.localStorage.getItem("tyt_token");
      if (token) {
      }
    } catch {
        console.log("token not found")
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 && typeof window !== "undefined") {
        try {
          window.localStorage.removeItem("tyt_token");
        } catch {   
          console.log("token not found")
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
