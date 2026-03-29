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

// ======================================================================
// --- CÁC HÀM MỚI CHO TÍNH NĂNG "TIẾN ĐỘ SỬA CHỮA" ---
// ======================================================================

// 1. Hàm lấy danh sách các máy đang sửa (để hiển thị ra bảng)
export const getOngoingRepairs = (storeId) => {
  const token = localStorage.getItem("token");

  // Truyền storeId lên Backend qua query parameter
  return axios.get(
    `http://localhost:5000/api/repair-requests/ongoing?storeId=${storeId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
};

// 2. Hàm cập nhật trạng thái tiến độ (Dùng cho nút "Báo hoàn thành" hoặc popup ghi chú)
export const updateRepairProgress = (requestId, status) => {
  const token = localStorage.getItem("token");

  return axios.put(
    `http://localhost:5000/api/repair-requests/${requestId}/progress`,
    { status: status }, // Dữ liệu gửi lên Backend
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
};