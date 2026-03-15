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