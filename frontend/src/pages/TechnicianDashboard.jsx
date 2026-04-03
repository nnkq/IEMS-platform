import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function formatVND(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const [techUser, setTechUser] = useState(null);
  const [assignedRequests, setAssignedRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Form báo cáo của thợ
  const [techNote, setTechNote] = useState("");

  // 1. KIỂM TRA ĐĂNG NHẬP: Lấy thông tin thợ đã đăng nhập từ hệ thống
  useEffect(() => {
    const storedUser = localStorage.getItem("techUser");
    if (!storedUser) {
      alert("Bạn chưa đăng nhập! Vui lòng đăng nhập.");
      navigate("/tech-login");
      return;
    }
    setTechUser(JSON.parse(storedUser));
  }, [navigate]);

  // 2. TẢI ĐƠN HÀNG: Chỉ tải đơn của chính thợ này
  useEffect(() => {
    if (!techUser || !techUser.id) return;
    
    fetch(`http://localhost:5000/api/technician/orders/${techUser.id}`)
      .then(res => res.json())
      .then(data => setAssignedRequests(Array.isArray(data) ? data : []));
  }, [techUser]);

  // 3. Hàm Thợ cập nhật đơn hàng
  const handleUpdateOrder = async (id, newStatus) => {
    try {
      const res = await fetch(`http://localhost:5000/api/technician/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: newStatus,
          technician_note: techNote
        })
      });

      if (res.ok) {
        alert("Đã cập nhật đơn hàng thành công!");
        const updatedRes = await fetch(`http://localhost:5000/api/technician/orders/${techUser.id}`);
        const updatedData = await updatedRes.json();
        setAssignedRequests(updatedData);
        setSelectedRequest(null);
      }
    } catch (err) {
      alert("Lỗi kết nối mạng!");
    }
  };

  // 4. Hàm Đăng xuất
  const handleLogout = () => {
    localStorage.removeItem("techUser");
    navigate("/tech-login");
  };

  const openDetail = (req) => {
    setSelectedRequest(req);
    setTechNote(req.technician_note || "");
  };

  const getStatusBadge = (status) => {
    if (status === "IN_PROGRESS") return <span style={{ background: "#fef3c7", color: "#d97706", padding: "4px 10px", borderRadius: "12px", fontWeight: "bold", fontSize: "12px" }}>Đang chờ bạn sửa</span>;
    if (status === "COMPLETED") return <span style={{ background: "#d1fae5", color: "#059669", padding: "4px 10px", borderRadius: "12px", fontWeight: "bold", fontSize: "12px" }}>Đã sửa xong</span>;
    if (status === "REJECTED") return <span style={{ background: "#fee2e2", color: "#ef4444", padding: "4px 10px", borderRadius: "12px", fontWeight: "bold", fontSize: "12px" }}>Đã từ chối</span>;
    return <span style={{ background: "#e0e7ff", color: "#2563eb", padding: "4px 10px", borderRadius: "12px", fontWeight: "bold", fontSize: "12px" }}>{status}</span>;
  };

  // Đợi load xong user mới hiển thị giao diện
  if (!techUser) return <div style={{ padding: "40px", textAlign: "center", fontWeight: "bold" }}>Đang tải dữ liệu...</div>;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9", fontFamily: "Inter, sans-serif" }}>
      {/* Topbar */}
      <div style={{ backgroundColor: "#1e293b", color: "white", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
        <h2 style={{ margin: 0, fontSize: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span>🔧</span> Không gian làm việc Kỹ Thuật Viên
        </h2>
        
        {/* KHU VỰC ĐÃ XÓA Ô CHỌN - THAY BẰNG TÊN NGƯỜI ĐĂNG NHẬP VÀ NÚT ĐĂNG XUẤT */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: "bold", fontSize: "15px" }}>{techUser.name}</div>
            <div style={{ color: "#94a3b8", fontSize: "13px" }}>Chuyên môn: {techUser.specialty}</div>
          </div>
          <button 
            onClick={handleLogout}
            style={{ padding: "8px 16px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
          <div>
            <h1 style={{ color: "#0f172a", marginTop: 0, marginBottom: "8px" }}>Công việc được giao ({assignedRequests.length})</h1>
            <p style={{ color: "#64748b", margin: 0 }}>Danh sách thiết bị khách hàng đang chờ bạn chẩn đoán và sửa chữa.</p>
          </div>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
          {assignedRequests.map(req => (
            <div key={req.id} style={{ backgroundColor: "white", padding: "24px", borderRadius: "20px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", transition: "transform 0.2s", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px dashed #e2e8f0" }}>
                <span style={{ color: "#64748b", fontSize: "14px", fontWeight: "bold" }}>Mã đơn: #RQ-{req.id}</span>
                {getStatusBadge(req.status)}
              </div>
              <h3 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "18px" }}>{req.device_type} {req.brand} {req.model}</h3>
              <p style={{ margin: "0 0 20px 0", color: "#ef4444", fontSize: "15px", fontWeight: "500", flex: 1 }}>⚠ {req.title}</p>
              
              <button 
                onClick={() => openDetail(req)}
                style={{ width: "100%", padding: "12px", backgroundColor: "#f8fafc", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "10px", fontWeight: "bold", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#eff6ff"}
                onMouseOut={(e) => e.target.style.backgroundColor = "#f8fafc"}
              >
                Mở hồ sơ khám bệnh →
              </button>
            </div>
          ))}
          {assignedRequests.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 20px", backgroundColor: "white", borderRadius: "20px", border: "1px dashed #cbd5e1" }}>
              <span style={{ fontSize: "40px", display: "block", marginBottom: "16px" }}>☕</span>
              <h3 style={{ color: "#475569", margin: "0 0 8px 0" }}>Tuyệt vời! Bạn đang rảnh rỗi</h3>
              <p style={{ color: "#94a3b8", margin: 0 }}>Chưa có đơn nào được phân công cho bạn lúc này.</p>
            </div>
          )}
        </div>
      </div>

      {/* Popup Khám Bệnh - CHỈ CÒN Ô NHẬP BÁO CÁO (ĐÃ XÓA NHẬP TIỀN) */}
      {selectedRequest && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100, padding: "20px", backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "white", width: "100%", maxWidth: "800px", borderRadius: "24px", padding: "32px", overflowY: "auto", maxHeight: "90vh", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", borderBottom: "2px solid #f1f5f9", paddingBottom: "16px" }}>
              <h2 style={{ margin: 0, color: "#0f172a", fontSize: "24px" }}>Hồ sơ bệnh án #RQ-{selectedRequest.id}</h2>
              <button onClick={() => setSelectedRequest(null)} style={{ background: "transparent", border: "none", fontSize: "28px", color: "#94a3b8", cursor: "pointer", lineHeight: 1 }}>&times;</button>
            </div>

            <div style={{ backgroundColor: "#f8fafc", padding: "24px", borderRadius: "16px", marginBottom: "24px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#334155", fontSize: "16px", textTransform: "uppercase", letterSpacing: "1px" }}>Chi tiết yêu cầu từ khách</h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#64748b", marginBottom: "6px" }}>Loại thiết bị</label>
                  <div style={{ padding: "12px 16px", backgroundColor: "white", borderRadius: "10px", border: "1px solid #cbd5e1", color: "#0f172a", fontWeight: "500" }}>{selectedRequest.device_type || "Không rõ"}</div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#64748b", marginBottom: "6px" }}>Thương hiệu</label>
                  <div style={{ padding: "12px 16px", backgroundColor: "white", borderRadius: "10px", border: "1px solid #cbd5e1", color: "#0f172a", fontWeight: "500" }}>{selectedRequest.brand || "Không rõ"}</div>
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#64748b", marginBottom: "6px" }}>Model / dòng máy</label>
                <div style={{ padding: "12px 16px", backgroundColor: "white", borderRadius: "10px", border: "1px solid #cbd5e1", color: "#0f172a", fontWeight: "500" }}>{selectedRequest.model || "Khách không nhập model"}</div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#64748b", marginBottom: "6px" }}>Tiêu đề vấn đề</label>
                <div style={{ padding: "12px 16px", backgroundColor: "white", borderRadius: "10px", border: "1px solid #cbd5e1", color: "#ef4444", fontWeight: "bold" }}>{selectedRequest.title || "Không có tiêu đề"}</div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#64748b", marginBottom: "8px" }}>Nhóm lỗi liên quan</label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {selectedRequest.symptoms ? selectedRequest.symptoms.split(',').map(s => s.trim()).filter(Boolean).map((s, idx) => (
                    <span key={idx} style={{ padding: "8px 16px", backgroundColor: "#3b82f6", color: "white", borderRadius: "20px", fontSize: "13px", fontWeight: "bold", boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)" }}>
                      {s}
                    </span>
                  )) : (
                    <span style={{ padding: "8px 16px", backgroundColor: "#e2e8f0", color: "#64748b", borderRadius: "20px", fontSize: "13px", fontStyle: "italic" }}>Khách không chọn nhóm lỗi</span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#64748b", marginBottom: "6px" }}>Mô tả chi tiết</label>
                <div style={{ padding: "16px", backgroundColor: "white", borderRadius: "10px", border: "1px solid #cbd5e1", color: "#334155", minHeight: "80px", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                  {selectedRequest.description || "Không có mô tả chi tiết."}
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#64748b", marginBottom: "8px" }}>Hình thức tiếp nhận</label>
                <div style={{ display: "inline-block", padding: "8px 20px", backgroundColor: "#2563eb", color: "white", borderRadius: "20px", fontSize: "14px", fontWeight: "bold" }}>
                  {selectedRequest.service_mode || "Không rõ"}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#64748b", marginBottom: "6px" }}>Ngân sách dự kiến</label>
                  <div style={{ padding: "12px 16px", backgroundColor: "white", borderRadius: "10px", border: "1px solid #cbd5e1", color: "#0f172a", fontWeight: "bold", fontSize: "16px" }}>
                    {selectedRequest.budget ? formatVND(selectedRequest.budget) : "Thỏa thuận"}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#dc2626", marginBottom: "6px" }}>Ngày mong muốn (DEADLINE)</label>
                  <div style={{ padding: "12px 16px", backgroundColor: "#fef2f2", borderRadius: "10px", border: "2px solid #fca5a5", color: "#b91c1c", fontWeight: "bold", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>⏱</span> {selectedRequest.desired_date ? new Date(selectedRequest.desired_date).toLocaleDateString('vi-VN') : "Không yêu cầu gấp"}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#64748b", marginBottom: "6px" }}>Số điện thoại liên hệ</label>
                  <div style={{ padding: "12px 16px", backgroundColor: "white", borderRadius: "10px", border: "1px solid #cbd5e1", color: "#0f172a", fontWeight: "500" }}>{selectedRequest.phone || "Không có"}</div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#64748b", marginBottom: "6px" }}>Địa chỉ nhận máy</label>
                  <div style={{ padding: "12px 16px", backgroundColor: "white", borderRadius: "10px", border: "1px solid #cbd5e1", color: "#0f172a", fontWeight: "500" }}>{selectedRequest.location || "Tại cửa hàng"}</div>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: "#fffbeb", padding: "24px", borderRadius: "16px", border: "1px solid #fde68a", marginBottom: "24px" }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#d97706", fontSize: "16px", textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "20px" }}>📝</span> Khu vực ghi chú của thợ
              </h3>
              
              <div>
                <label style={{ display: "block", fontWeight: "bold", color: "#92400e", marginBottom: "8px", fontSize: "14px" }}>Báo cáo tình trạng thiết bị</label>
                <textarea 
                  value={techNote} 
                  onChange={(e) => setTechNote(e.target.value)} 
                  placeholder="Ví dụ: Khám thấy main bị chập nguồn, cần thay IC nguồn thay vì thay pin..."
                  style={{ width: "100%", padding: "16px", borderRadius: "10px", border: "1px solid #fcd34d", minHeight: "100px", boxSizing: "border-box", fontSize: "15px", lineHeight: "1.6", outlineColor: "#d97706" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", borderTop: "2px solid #f1f5f9", paddingTop: "24px" }}>
              <button onClick={() => setSelectedRequest(null)} style={{ flex: 1, padding: "16px", background: "white", color: "#64748b", border: "2px solid #e2e8f0", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "15px" }}>
                Hủy bỏ
              </button>
              
              <button onClick={() => handleUpdateOrder(selectedRequest.id, "REJECTED")} style={{ flex: 1, padding: "16px", background: "white", color: "#ef4444", border: "2px solid #fca5a5", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "15px" }}>
                Từ chối / Trả máy
              </button>
              
              <button onClick={() => handleUpdateOrder(selectedRequest.id, selectedRequest.status)} style={{ flex: 1, padding: "16px", background: "#3b82f6", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "15px", boxShadow: "0 4px 6px rgba(59, 130, 246, 0.3)" }}>
                Lưu báo cáo
              </button>
              
              <button onClick={() => handleUpdateOrder(selectedRequest.id, "COMPLETED")} style={{ flex: 1.5, padding: "16px", background: "#10b981", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "15px", boxShadow: "0 4px 6px rgba(16, 185, 129, 0.3)" }}>
                ✅ Đã sửa xong
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}