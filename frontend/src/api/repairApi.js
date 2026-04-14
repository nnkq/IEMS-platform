import axios from "axios";

export const createRepairRequest = (data) => {
  const token = localStorage.getItem("token");

  return axios.post("http://localhost:5000/api/repair-requests", data, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const getMyRepairRequests = () => {
  const token = localStorage.getItem("token");

  return axios.get("http://localhost:5000/api/repair-requests/my", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const getOngoingRepairs = (storeId) => {
  const token = localStorage.getItem("token");

  return axios.get(
    `http://localhost:5000/api/repair-requests/ongoing?storeId=${storeId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

export const updateRepairProgress = (requestId, status) => {
  const token = localStorage.getItem("token");

  return axios.put(
    `http://localhost:5000/api/repair-requests/${requestId}/progress`,
    { status },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

export const getReviewForRequest = (requestId) => {
  const token = localStorage.getItem("token");

  return axios.get(
    `http://localhost:5000/api/repair-requests/${requestId}/review`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};
export const getStoreReviews = (storeId) => {
  const token = localStorage.getItem("token");

  return axios.get(
    `http://localhost:5000/api/repair-requests/store/${storeId}/reviews`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

export const submitReviewForRequest = (requestId, data) => {
  const token = localStorage.getItem("token");

  return axios.post(
    `http://localhost:5000/api/repair-requests/${requestId}/review`,
    data,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  
};