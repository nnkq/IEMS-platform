import axios from "axios";

export const createRepairRequest = (data) => {
  const token = localStorage.getItem("token");

  return axios.post(
    "http://localhost:5000/api/repair-requests",
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
};

export const getMyRepairRequests = () => {
  const token = localStorage.getItem("token");

  return axios.get(
    "http://localhost:5000/api/repair-requests/my",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
};