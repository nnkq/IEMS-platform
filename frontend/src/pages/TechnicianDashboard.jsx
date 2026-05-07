import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function formatVND(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

const cardStyle = {
  backgroundColor: "white",
  padding: "24px",
  borderRadius: "20px",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
  border: "1px solid #e2e8f0",
};

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const [techUser, setTechUser] = useState(null);
  const [assignedRequests, setAssignedRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [techNote, setTechNote] = useState("");
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteEta, setQuoteEta] = useState("");
  const [quoteMessage, setQuoteMessage] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("techUser");
    if (!storedUser) {
      navigate("/tech-login");
      return;
    }
    setTechUser(JSON.parse(storedUser));
  }, [navigate]);

  const loadOrders = async (employeeId) => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/technician/orders/${employeeId}`);
      const data = await res.json();
      setAssignedRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Lỗi tải đơn kỹ thuật viên:", error);
      setAssignedRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!techUser?.id) return;
    loadOrders(techUser.id);
  }, [techUser]);

  const handleLogout = () => {
    localStorage.removeItem("techUser");
    navigate("/tech-login");
  };

  const openDetail = (req) => {
    setSelectedRequest(req);
    setTechNote(req.technician_note || "");
    setQuotePrice(req.quote_price || "");
    setQuoteEta(req.quote_estimated_time || "");
    setQuoteMessage(req.quote_message || req.technician_note || "");
  };


  const handleUpdateOrder = async (nextStatus) => {
    if (!selectedRequest?.id) return;

    if (nextStatus === "QUOTED") {
      if (!techNote.trim()) {
        alert("Vui lòng nhập báo cáo tình trạng thiết bị.");
        return;
      }
      if (!quotePrice || Number(quotePrice) <= 0) {
        alert("Vui lòng nhập giá báo cho khách hàng.");
        return;
      }
    }

    try {
      setSaving(true);
      const res = await fetch(`http://localhost:5000/api/technician/orders/${selectedRequest.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          technician_note: techNote,
          quote_price: quotePrice,
          estimated_time: quoteEta,
          quote_message: quoteMessage || techNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Cập nhật thất bại");
      }

      alert(data.message || "Đã cập nhật đơn hàng thành công!");
      await loadOrders(techUser.id);
      setSelectedRequest(null);
    } catch (err) {
      alert(err.message || "Lỗi kết nối mạng!");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    const common = {
      padding: "6px 12px",
      borderRadius: "999px",
      fontWeight: "bold",
      fontSize: "12px",
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
    };

    if (status === "OPEN") {
      return <span style={{ ...common, background: "#e0f2fe", color: "#0369a1" }}>Đơn mới được giao</span>;
    }
    if (status === "QUOTED") {
      return <span style={{ ...common, background: "#fef3c7", color: "#d97706" }}>Đã báo giá · chờ khách duyệt</span>;
    }
    if (status === "IN_PROGRESS") {
      return <span style={{ ...common, background: "#dbeafe", color: "#2563eb" }}>Khách đã đồng ý · đang sửa</span>;
    }
    if (status === "WAITING_STORE_CONFIRM") {
      return <span style={{ ...common, background: "#dcfce7", color: "#15803d" }}>Đã báo Store xác nhận</span>;
    }
    if (status === "WAITING_CUSTOMER_CONFIRM") {
      return <span style={{ ...common, background: "#ecfccb", color: "#4d7c0f" }}>Store đã báo khách · chờ xác nhận</span>;
    }
    if (status === "COMPLETED") {
      return <span style={{ ...common, background: "#d1fae5", color: "#059669" }}>Khách đã xác nhận hoàn tất</span>;
    }
    if (status === "REJECTED") {
      return <span style={{ ...common, background: "#fee2e2", color: "#ef4444" }}>Đã từ chối</span>;
    }
    if (status === "CANCELLED") {
      return <span style={{ ...common, background: "#e5e7eb", color: "#6b7280" }}>Khách đã hủy</span>;
    }
    return <span style={{ ...common, background: "#ede9fe", color: "#7c3aed" }}>{status}</span>;
  };

  const counters = useMemo(() => ({
    open: assignedRequests.filter((x) => x.status === "OPEN").length,
    quoted: assignedRequests.filter((x) => x.status === "QUOTED").length,
    inProgress: assignedRequests.filter((x) => x.status === "IN_PROGRESS").length,
    completed: assignedRequests.filter((x) => ["WAITING_STORE_CONFIRM", "WAITING_CUSTOMER_CONFIRM", "COMPLETED"].includes(x.status)).length,
  }), [assignedRequests]);

  if (!techUser) {
    return <div style={{ padding: "40px", textAlign: "center", fontWeight: "bold" }}>Đang tải dữ liệu...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9", fontFamily: "Inter, sans-serif" }}>
      <div
        style={{
          backgroundColor: "#1e293b",
          color: "white",
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span>🔧</span> Không gian làm việc Kỹ Thuật Viên
        </h2>

        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: "bold", fontSize: "15px" }}>{techUser.name}</div>
            <div style={{ color: "#94a3b8", fontSize: "13px" }}>Chuyên môn: {techUser.specialty}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Đăng xuất
          </button>
        </div>
      </div>

      <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ color: "#0f172a", marginTop: 0, marginBottom: "8px" }}>Công việc được giao ({assignedRequests.length})</h1>
          <p style={{ color: "#64748b", margin: 0 }}>
            Luồng mới: xem chi tiết → báo tình trạng + báo giá → chờ khách đồng ý → mới tiến hành sửa.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={cardStyle}><div style={{ color: "#64748b" }}>Mới nhận</div><strong style={{ fontSize: 28 }}>{counters.open}</strong></div>
          <div style={cardStyle}><div style={{ color: "#64748b" }}>Đã báo giá</div><strong style={{ fontSize: 28 }}>{counters.quoted}</strong></div>
          <div style={cardStyle}><div style={{ color: "#64748b" }}>Đang sửa</div><strong style={{ fontSize: 28 }}>{counters.inProgress}</strong></div>
          <div style={cardStyle}><div style={{ color: "#64748b" }}>Hoàn tất</div><strong style={{ fontSize: 28 }}>{counters.completed}</strong></div>
        </div>

        {loading && <div style={{ ...cardStyle, textAlign: "center" }}>Đang tải đơn được giao...</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
          {assignedRequests.map((req) => (
            <div key={req.id} style={{ ...cardStyle, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px dashed #e2e8f0" }}>
                <span style={{ color: "#64748b", fontSize: "14px", fontWeight: "bold" }}>Mã đơn: #RQ-{req.id}</span>
                {getStatusBadge(req.status)}
              </div>

              <h3 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "18px" }}>
                {req.device_type} {req.brand} {req.model}
              </h3>
              <p style={{ margin: "0 0 12px 0", color: "#ef4444", fontSize: "15px", fontWeight: "500" }}>
                ⚠ {req.title || "Khách chưa nhập tiêu đề lỗi"}
              </p>
              <p style={{ margin: "0 0 12px 0", color: "#475569", flex: 1 }}>
                {req.description || "Không có mô tả chi tiết"}
              </p>

              <div style={{ display: "grid", gap: "8px", marginBottom: "16px", color: "#475569", fontSize: "14px" }}>
                <div><strong>Ngân sách khách:</strong> {req.budget ? formatVND(req.budget) : "Thỏa thuận"}</div>
                {req.quote_price ? <div><strong>Giá đã báo:</strong> {formatVND(req.quote_price)}</div> : null}
                {req.quote_estimated_time ? <div><strong>Thời gian dự kiến:</strong> {req.quote_estimated_time}</div> : null}
              </div>

              <button
                onClick={() => openDetail(req)}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "#f8fafc",
                  color: "#2563eb",
                  border: "1px solid #bfdbfe",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Mở hồ sơ xử lý →
              </button>
            </div>
          ))}

          {!loading && assignedRequests.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 20px", backgroundColor: "white", borderRadius: "20px", border: "1px dashed #cbd5e1" }}>
              <span style={{ fontSize: "40px", display: "block", marginBottom: "16px" }}>☕</span>
              <h3 style={{ color: "#475569", margin: "0 0 8px 0" }}>Chưa có đơn nào được phân công cho bạn</h3>
              <p style={{ color: "#94a3b8", margin: 0 }}>Khi store giao việc, đơn sẽ xuất hiện tại đây.</p>
            </div>
          )}
        </div>
      </div>

      {selectedRequest && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100, padding: "20px", backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "white", width: "100%", maxWidth: "900px", borderRadius: "24px", padding: "32px", overflowY: "auto", maxHeight: "90vh", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", borderBottom: "2px solid #f1f5f9", paddingBottom: "16px" }}>
              <div>
                <h2 style={{ margin: 0, color: "#0f172a", fontSize: "24px" }}>Hồ sơ xử lý #RQ-{selectedRequest.id}</h2>
                <div style={{ marginTop: 8 }}>{getStatusBadge(selectedRequest.status)}</div>
              </div>
              <button onClick={() => setSelectedRequest(null)} style={{ background: "transparent", border: "none", fontSize: "28px", color: "#94a3b8", cursor: "pointer", lineHeight: 1 }}>&times;</button>
            </div>

            <div style={{ ...cardStyle, marginBottom: 24, backgroundColor: "#f8fafc" }}>
              <h3 style={{ margin: "0 0 20px 0", color: "#334155", fontSize: "16px", textTransform: "uppercase", letterSpacing: "1px" }}>Chi tiết yêu cầu từ khách</h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div><strong>Loại thiết bị:</strong> {selectedRequest.device_type || "Không rõ"}</div>
                <div><strong>Thương hiệu:</strong> {selectedRequest.brand || "Không rõ"}</div>
                <div><strong>Model:</strong> {selectedRequest.model || "Khách không nhập"}</div>
                <div><strong>Ngân sách dự kiến:</strong> {selectedRequest.budget ? formatVND(selectedRequest.budget) : "Thỏa thuận"}</div>
                <div><strong>Số điện thoại:</strong> {selectedRequest.phone || "Không có"}</div>
                <div><strong>Địa chỉ:</strong> {selectedRequest.location || "Tại cửa hàng"}</div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <strong>Tiêu đề lỗi:</strong>
                <div style={{ marginTop: 8, color: "#ef4444", fontWeight: 700 }}>{selectedRequest.title || "Không có tiêu đề"}</div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <strong>Mô tả chi tiết:</strong>
                <div style={{ marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{selectedRequest.description || "Không có mô tả chi tiết."}</div>
              </div>

              {selectedRequest.image ? (
                <div>
                  <strong>Hình ảnh khách gửi:</strong>
                  <img
                    src={selectedRequest.image}
                    alt="Ảnh thiết bị"
                    style={{ width: "100%", maxHeight: 300, objectFit: "contain", marginTop: 12, borderRadius: 12, border: "1px dashed #cbd5e1", background: "white", padding: 8 }}
                  />
                </div>
              ) : null}
            </div>

            <div style={{ ...cardStyle, marginBottom: 24, backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}>
              <h3 style={{ margin: "0 0 16px 0", color: "#d97706", fontSize: "16px", textTransform: "uppercase", letterSpacing: "1px" }}>
                Khu vực chẩn đoán và báo giá
              </h3>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontWeight: "bold", color: "#92400e", marginBottom: 8 }}>Báo cáo tình trạng thiết bị</label>
                <textarea
                  value={techNote}
                  onChange={(e) => setTechNote(e.target.value)}
                  placeholder="Ví dụ: Main chập nguồn, cần thay IC nguồn và kiểm tra lại pin..."
                  style={{ width: "100%", padding: "16px", borderRadius: "10px", border: "1px solid #fcd34d", minHeight: "110px", boxSizing: "border-box", fontSize: "15px", lineHeight: "1.6", outlineColor: "#d97706" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontWeight: "bold", color: "#92400e", marginBottom: 8 }}>Giá báo cho khách</label>
                  <input
                    type="number"
                    min="0"
                    value={quotePrice}
                    onChange={(e) => setQuotePrice(e.target.value)}
                    placeholder="Ví dụ: 850000"
                    style={{ width: "100%", padding: 14, borderRadius: 10, border: "1px solid #fcd34d", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: "bold", color: "#92400e", marginBottom: 8 }}>Thời gian dự kiến</label>
                  <input
                    type="text"
                    value={quoteEta}
                    onChange={(e) => setQuoteEta(e.target.value)}
                    placeholder="Ví dụ: 2 ngày hoặc 4 giờ"
                    style={{ width: "100%", padding: 14, borderRadius: 10, border: "1px solid #fcd34d", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: "bold", color: "#92400e", marginBottom: 8 }}>Lời nhắn gửi khách hàng</label>
                <textarea
                  value={quoteMessage}
                  onChange={(e) => setQuoteMessage(e.target.value)}
                  placeholder="Ví dụ: Máy cần thay IC nguồn, sau khi khách đồng ý báo giá cửa hàng sẽ tiến hành sửa ngay."
                  style={{ width: "100%", padding: "16px", borderRadius: "10px", border: "1px solid #fcd34d", minHeight: "90px", boxSizing: "border-box", fontSize: "15px", lineHeight: "1.6", outlineColor: "#d97706" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", borderTop: "2px solid #f1f5f9", paddingTop: "24px" }}>
              <button onClick={() => setSelectedRequest(null)} style={{ flex: 1, padding: "16px", background: "white", color: "#64748b", border: "2px solid #e2e8f0", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "15px" }}>
                Đóng
              </button>

              <button
                onClick={() => handleUpdateOrder(selectedRequest.status)}
                disabled={saving}
                style={{ flex: 1, padding: "16px", background: "#3b82f6", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "15px" }}
              >
                Lưu ghi chú
              </button>

              {selectedRequest.status === "OPEN" && (
                <button
                  onClick={() => handleUpdateOrder("QUOTED")}
                  disabled={saving}
                  style={{ flex: 1.4, padding: "16px", background: "#f59e0b", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "15px" }}
                >
                  Gửi tình trạng + báo giá
                </button>
              )}

              {selectedRequest.status === "QUOTED" && (
                <div style={{ flex: 1.6, padding: "16px", background: "#fff7ed", color: "#c2410c", border: "1px solid #fdba74", borderRadius: "12px", fontWeight: "bold", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  Đang chờ khách hàng đồng ý báo giá
                </div>
              )}

              {selectedRequest.status === "IN_PROGRESS" && (
                <button
                  onClick={() => handleUpdateOrder("WAITING_STORE_CONFIRM")}
                  disabled={saving}
                  style={{ flex: 1.5, padding: "16px", background: "#10b981", color: "white", border: "none", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "15px" }}
                >
                  ✅ Báo Store đã sửa xong
                </button>
              )}

              {selectedRequest.status === "WAITING_STORE_CONFIRM" && (
                <div style={{ flex: 1.8, padding: "16px", background: "#ecfdf5", color: "#047857", border: "1px solid #6ee7b7", borderRadius: "12px", fontWeight: "bold", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  Đã báo Store xác nhận hoàn thành
                </div>
              )}

              {selectedRequest.status === "WAITING_CUSTOMER_CONFIRM" && (
                <div style={{ flex: 1.8, padding: "16px", background: "#f7fee7", color: "#4d7c0f", border: "1px solid #bef264", borderRadius: "12px", fontWeight: "bold", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  Store đã báo khách · chờ khách xác nhận
                </div>
              )}

              {(selectedRequest.status === "OPEN" || selectedRequest.status === "QUOTED") && (
                <button
                  onClick={() => handleUpdateOrder("REJECTED")}
                  disabled={saving}
                  style={{ flex: 1, padding: "16px", background: "white", color: "#ef4444", border: "2px solid #fca5a5", borderRadius: "12px", cursor: "pointer", fontWeight: "bold", fontSize: "15px" }}
                >
                  Từ chối / Trả máy
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
