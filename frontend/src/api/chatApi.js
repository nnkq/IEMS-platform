import axios from "axios";

const API_URL = "http://localhost:5000/api/chat";

export const createOrGetConversationByRequest = (payload) =>
  axios.post(`${API_URL}/conversation/by-request`, payload);

export const getUserConversations = (userId) =>
  axios.get(`${API_URL}/user/${userId}`);

export const getStoreConversations = (storeId) =>
  axios.get(`${API_URL}/store/${storeId}`);

export const getConversationMessages = (conversationId) =>
  axios.get(`${API_URL}/conversation/${conversationId}/messages`);

export const sendChatMessageApi = (payload) =>
  axios.post(`${API_URL}/messages`, payload);

export const markConversationRead = (conversationId, reader_role) =>
  axios.put(`${API_URL}/conversation/${conversationId}/read`, { reader_role });