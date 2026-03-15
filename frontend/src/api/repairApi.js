import axios from "axios";

const API_URL = "http://localhost:5000/api";

export const createRepairRequest = async (data) => {
  return axios.post(`${API_URL}/repair-requests`, data);
};