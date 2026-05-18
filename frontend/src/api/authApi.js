import axios from "axios";

const API = axios.create({
  baseURL: "/api/auth",
});

export const registerUser = (data) => API.post("/register", data);
export const loginUser = (data) => API.post("/login", data);
export const forgotPassword = (data) => API.post("/forgot-password", data);
export const resetPassword = (token, data) =>
  API.post(`/reset-password/${token}`, data);

export const changeMyPassword = (data) =>
  axios.put("/api/users/me/change-password", data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
  });
