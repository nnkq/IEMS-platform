import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api/home",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const getHomeDashboard = () => API.get("/dashboard");
export const searchHome = (q) =>
  API.get(`/search?q=${encodeURIComponent(q)}`);