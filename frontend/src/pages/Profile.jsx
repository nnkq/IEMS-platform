import { useEffect, useState } from "react";
import "./Profile.css";

export default function Profile() {
  const [user, setUser] = useState(null);

  const [stats, setStats] = useState({
    totalRequests: 8,
    openRequests: 2,
    quotedRequests: 1,
    inProgressRequests: 2,
    completedRequests: 3,
    cancelledRequests: 0,

    totalOrders: 4,
    waitingOrders: 1,
    completedOrders: 3,

    pendingPayments: 1,
    paidPayments: 3,
    totalSpent: 2450000,

    totalReviews: 2,
    unreadNotifications: 5,
    aiDiagnosisCount: 6,
  });

  const [recentActivities, setRecentActivities] = useState([
    {
      id: 1,
      type: "repair",
      title: "Yêu cầu sửa chữa màn hình iPhone 12",
      time: "2026-03-10 09:15",
      status: "IN_PROGRESS",
    },
    {
      id: 2,
      type: "payment",
      title: "Thanh toán đơn sửa chữa laptop Dell",
      time: "2026-03-08 14:20",
      status: "PAID",
    },
    {
      id: 3,
      type: "quote",
      title: "Nhận báo giá thay pin MacBook",
      time: "2026-03-07 10:30",
      status: "QUOTED",
    },
    {
      id: 4,
      type: "ai",
      title: "AI chẩn đoán lỗi loa điện thoại Samsung",
      time: "2026-03-05 16:00",
      status: "DONE",
    },
  ]);

  const [recentDiagnosis, setRecentDiagnosis] = useState([
    {
      id: 1,
      deviceName: "iPhone 12",
      userDescription: "Màn hình bị sọc xanh, cảm ứng lúc được lúc không",
      aiDiagnosis: "Khả năng cao lỗi màn hình hoặc cáp kết nối màn hình",
      estimatedPrice: 1200000,
      createdAt: "2026-03-09 08:30",
    },
    {
      id: 2,
      deviceName: "Dell Inspiron",
      userDescription: "Laptop nóng nhanh và tự tắt sau 10 phút sử dụng",
      aiDiagnosis: "Có thể quạt tản nhiệt bám bụi hoặc keo tản nhiệt đã khô",
      estimatedPrice: 450000,
      createdAt: "2026-03-06 11:10",
    },
  ]);

  useEffect(() => {
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error("Lỗi đọc user:", error);
    }
  }, []);

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString("vi-VN") + " đ";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Chưa có";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleString("vi-VN");
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "OPEN":
        return "status-badge open";
      case "QUOTED":
        return "status-badge quoted";
      case "IN_PROGRESS":
        return "status-badge progress";
      case "COMPLETED":
        return "status-badge completed";
      case "CANCELLED":
        return "status-badge cancelled";
      case "PAID":
        return "status-badge completed";
      case "DONE":
        return "status-badge quoted";
      default:
        return "status-badge";
    }
  };

  const displayName = user?.name || user?.fullName || "Khách hàng";
  const email = user?.email || "Chưa cập nhật";
  const phone = user?.phone || "Chưa cập nhật";
  const role = user?.role || "USER";
  const createdAt = user?.created_at || user?.createdAt || null;
  const googleId = user?.google_id || user?.googleId || null;

  return (
    <div className="profile-page">
      <div className="profile-wrapper">
        <div className="profile-header-card">
          <div className="profile-header-left">
            <div className="profile-avatar">
              {displayName?.charAt(0)?.toUpperCase() || "K"}
            </div>

            <div className="profile-main-info">
              <span className="profile-tag">Hồ sơ khách hàng</span>
              <h1>{displayName}</h1>
              <p>{email}</p>

              <div className="profile-meta-inline">
                <span className="meta-pill">Vai trò: {role}</span>
                <span className="meta-pill">
                  Số điện thoại: {phone || "Chưa cập nhật"}
                </span>
                <span className="meta-pill">
                  Đăng ký: {createdAt ? formatDate(createdAt) : "Chưa rõ"}
                </span>
                <span className="meta-pill">
                  Đăng nhập: {googleId ? "Google" : "Tài khoản thường"}
                </span>
              </div>
            </div>
          </div>

          <div className="profile-header-right">
            <button className="primary-action">Chỉnh sửa hồ sơ</button>
            <button className="secondary-action">Đổi mật khẩu</button>
          </div>
        </div>

        <div className="profile-grid">
          <div className="profile-column-main">
            <section className="profile-card">
              <div className="section-head">
                <h2>Thông tin cá nhân</h2>
                <span>Chi tiết từ bảng users</span>
              </div>

              <div className="info-grid">
                <div className="info-item">
                  <label>Họ và tên</label>
                  <p>{displayName}</p>
                </div>

                <div className="info-item">
                  <label>Email</label>
                  <p>{email}</p>
                </div>

                <div className="info-item">
                  <label>Số điện thoại</label>
                  <p>{phone}</p>
                </div>

                <div className="info-item">
                  <label>Vai trò</label>
                  <p>{role}</p>
                </div>

                <div className="info-item">
                  <label>Ngày tạo tài khoản</label>
                  <p>{createdAt ? formatDate(createdAt) : "Chưa có dữ liệu"}</p>
                </div>

                <div className="info-item">
                  <label>Liên kết Google</label>
                  <p>{googleId ? "Đã liên kết" : "Chưa liên kết"}</p>
                </div>

                <div className="info-item full">
                  <label>Mã Google</label>
                  <p>{googleId || "Không có"}</p>
                </div>
              </div>
            </section>

            <section className="profile-card">
              <div className="section-head">
                <h2>Thống kê yêu cầu sửa chữa</h2>
                <span>Dữ liệu liên quan bảng repair_requests</span>
              </div>

              <div className="stats-grid">
                <div className="stat-box">
                  <h3>{stats.totalRequests}</h3>
                  <p>Tổng yêu cầu</p>
                </div>
                <div className="stat-box">
                  <h3>{stats.openRequests}</h3>
                  <p>Đang mở</p>
                </div>
                <div className="stat-box">
                  <h3>{stats.quotedRequests}</h3>
                  <p>Đã báo giá</p>
                </div>
                <div className="stat-box">
                  <h3>{stats.inProgressRequests}</h3>
                  <p>Đang sửa</p>
                </div>
                <div className="stat-box">
                  <h3>{stats.completedRequests}</h3>
                  <p>Hoàn thành</p>
                </div>
                <div className="stat-box">
                  <h3>{stats.cancelledRequests}</h3>
                  <p>Đã hủy</p>
                </div>
              </div>
            </section>

            <section className="profile-card">
              <div className="section-head">
                <h2>Đơn hàng, thanh toán và đánh giá</h2>
                <span>orders, payments, reviews, notifications</span>
              </div>

              <div className="summary-grid">
                <div className="summary-item">
                  <label>Tổng đơn hàng</label>
                  <strong>{stats.totalOrders}</strong>
                </div>
                <div className="summary-item">
                  <label>Đơn chờ xử lý</label>
                  <strong>{stats.waitingOrders}</strong>
                </div>
                <div className="summary-item">
                  <label>Đơn hoàn thành</label>
                  <strong>{stats.completedOrders}</strong>
                </div>
                <div className="summary-item">
                  <label>Thanh toán chờ xử lý</label>
                  <strong>{stats.pendingPayments}</strong>
                </div>
                <div className="summary-item">
                  <label>Thanh toán thành công</label>
                  <strong>{stats.paidPayments}</strong>
                </div>
                <div className="summary-item">
                  <label>Tổng chi tiêu</label>
                  <strong>{formatMoney(stats.totalSpent)}</strong>
                </div>
                <div className="summary-item">
                  <label>Số đánh giá đã gửi</label>
                  <strong>{stats.totalReviews}</strong>
                </div>
                <div className="summary-item">
                  <label>Thông báo chưa đọc</label>
                  <strong>{stats.unreadNotifications}</strong>
                </div>
              </div>
            </section>

            <section className="profile-card">
              <div className="section-head">
                <h2>Lịch sử AI chẩn đoán gần đây</h2>
                <span>Bảng ai_diagnosis_logs + devices</span>
              </div>

              <div className="diagnosis-list">
                {recentDiagnosis.map((item) => (
                  <div className="diagnosis-card" key={item.id}>
                    <div className="diagnosis-top">
                      <h3>{item.deviceName}</h3>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>

                    <div className="diagnosis-row">
                      <label>Mô tả của khách hàng</label>
                      <p>{item.userDescription}</p>
                    </div>

                    <div className="diagnosis-row">
                      <label>Kết quả AI dự đoán</label>
                      <p>{item.aiDiagnosis}</p>
                    </div>

                    <div className="diagnosis-row">
                      <label>Chi phí ước tính</label>
                      <p className="price-text">{formatMoney(item.estimatedPrice)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="profile-column-side">
            <section className="profile-card">
              <div className="section-head">
                <h2>Tổng quan hiện tại</h2>
                <span>Thông tin nhanh</span>
              </div>

              <div className="quick-list">
                <div className="quick-item">
                  <span>Yêu cầu đang xử lý</span>
                  <strong>{stats.inProgressRequests}</strong>
                </div>
                <div className="quick-item">
                  <span>Báo giá chờ phản hồi</span>
                  <strong>{stats.quotedRequests}</strong>
                </div>
                <div className="quick-item">
                  <span>Thanh toán chờ xử lý</span>
                  <strong>{stats.pendingPayments}</strong>
                </div>
                <div className="quick-item">
                  <span>Chẩn đoán AI đã dùng</span>
                  <strong>{stats.aiDiagnosisCount}</strong>
                </div>
                <div className="quick-item">
                  <span>Thông báo chưa đọc</span>
                  <strong>{stats.unreadNotifications}</strong>
                </div>
              </div>
            </section>

            <section className="profile-card">
              <div className="section-head">
                <h2>Hoạt động gần đây</h2>
                <span>Timeline người dùng</span>
              </div>

              <div className="activity-list">
                {recentActivities.map((item) => (
                  <div className="activity-item" key={item.id}>
                    <div className="activity-dot"></div>
                    <div className="activity-content">
                      <p>{item.title}</p>
                      <div className="activity-meta">
                        <span>{formatDate(item.time)}</span>
                        <span className={getStatusClass(item.status)}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}