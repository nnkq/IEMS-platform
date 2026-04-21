import { useEffect, useState } from "react";
import "./Profile.css";

const DEFAULT_STATS = {
  totalRequests: 0,
  openRequests: 0,
  quotedRequests: 0,
  inProgressRequests: 0,
  completedRequests: 0,
  cancelledRequests: 0,
  totalOrders: 0,
  waitingOrders: 0,
  completedOrders: 0,
  pendingPayments: 0,
  paidPayments: 0,
  totalSpent: 0,
  totalReviews: 0,
  unreadNotifications: 0,
  aiDiagnosisCount: 0,
};

export default function Profile() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [recentActivities, setRecentActivities] = useState([]);
  const [recentDiagnosis, setRecentDiagnosis] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      case "UNREAD":
        return "status-badge open";
      case "QUOTED":
      case "DONE":
        return "status-badge quoted";
      case "IN_PROGRESS":
      case "WAITING":
        return "status-badge progress";
      case "COMPLETED":
      case "PAID":
      case "READ":
        return "status-badge completed";
      case "CANCELLED":
        return "status-badge cancelled";
      default:
        return "status-badge";
    }
  };

  const loadProfile = async ({ silent = false } = {}) => {
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Bạn chưa đăng nhập");
      setLoading(false);
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      }
      setError("");

      const res = await fetch("http://localhost:5000/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Không tải được hồ sơ người dùng");
      }

      setUser(data.user || null);
      setStats({ ...DEFAULT_STATS, ...(data.stats || {}) });
      setRecentActivities(Array.isArray(data.recentActivities) ? data.recentActivities : []);
      setRecentDiagnosis(Array.isArray(data.recentDiagnosis) ? data.recentDiagnosis : []);
      setRecentNotifications(Array.isArray(data.recentNotifications) ? data.recentNotifications : []);

      const localUser = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...localUser,
          ...(data.user || {}),
        })
      );
    } catch (fetchError) {
      console.error("Lỗi tải hồ sơ:", fetchError);
      setError(fetchError.message || "Không tải được hồ sơ người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();

    const interval = setInterval(() => {
      loadProfile({ silent: true });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const displayName = user?.name || user?.fullName || "Khách hàng";
  const email = user?.email || "Chưa cập nhật";
  const phone = user?.phone || "Chưa cập nhật";
  const role = user?.roleLabel || user?.role || "USER";
  const createdAt = user?.created_at || user?.createdAt || null;
  const googleId = user?.google_id || user?.googleId || null;

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-wrapper">
          <div className="profile-card">Đang tải hồ sơ người dùng...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-wrapper">
        {error && <div className="profile-alert error">{error}</div>}

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
                <span className="meta-pill">Số điện thoại: {phone || "Chưa cập nhật"}</span>
                <span className="meta-pill">Đăng ký: {createdAt ? formatDate(createdAt) : "Chưa rõ"}</span>
                <span className="meta-pill">Đăng nhập: {googleId ? "Google" : "Tài khoản thường"}</span>
              </div>
            </div>
          </div>

          <div className="profile-header-right">
            <button className="primary-action" onClick={() => loadProfile()}>Làm mới dữ liệu</button>
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
                <div className="stat-box"><h3>{stats.totalRequests}</h3><p>Tổng yêu cầu</p></div>
                <div className="stat-box"><h3>{stats.openRequests}</h3><p>Đang mở</p></div>
                <div className="stat-box"><h3>{stats.quotedRequests}</h3><p>Đã báo giá</p></div>
                <div className="stat-box"><h3>{stats.inProgressRequests}</h3><p>Đang sửa</p></div>
                <div className="stat-box"><h3>{stats.completedRequests}</h3><p>Hoàn thành</p></div>
                <div className="stat-box"><h3>{stats.cancelledRequests}</h3><p>Đã hủy</p></div>
              </div>
            </section>

            <section className="profile-card">
              <div className="section-head">
                <h2>Đơn hàng, thanh toán và đánh giá</h2>
                <span>orders, payments, reviews, notifications</span>
              </div>

              <div className="summary-grid">
                <div className="summary-item"><label>Tổng đơn hàng</label><strong>{stats.totalOrders}</strong></div>
                <div className="summary-item"><label>Đơn chờ xử lý</label><strong>{stats.waitingOrders}</strong></div>
                <div className="summary-item"><label>Đơn hoàn thành</label><strong>{stats.completedOrders}</strong></div>
                <div className="summary-item"><label>Thanh toán chờ xử lý</label><strong>{stats.pendingPayments}</strong></div>
                <div className="summary-item"><label>Thanh toán thành công</label><strong>{stats.paidPayments}</strong></div>
                <div className="summary-item"><label>Tổng chi tiêu</label><strong>{formatMoney(stats.totalSpent)}</strong></div>
                <div className="summary-item"><label>Số đánh giá đã gửi</label><strong>{stats.totalReviews}</strong></div>
                <div className="summary-item"><label>Thông báo chưa đọc</label><strong>{stats.unreadNotifications}</strong></div>
              </div>
            </section>

            <section className="profile-card">
              <div className="section-head">
                <h2>Thông báo của bạn</h2>
                <span>Tự động làm mới mỗi 10 giây</span>
              </div>

              <div className="notification-list">
                {recentNotifications.length === 0 ? (
                  <div className="notification-empty">Chưa có thông báo nào.</div>
                ) : (
                  recentNotifications.map((item) => (
                    <div className={`notification-card ${item.isRead ? "" : "unread"}`.trim()} key={item.id}>
                      <div className="notification-top">
                        <div>
                          <h3>{item.title || "Thông báo hệ thống"}</h3>
                          <p className="notification-sender">
                            {item.senderName
                              ? `Từ: ${item.senderName}${item.senderRole ? ` (${item.senderRole})` : ""}`
                              : "Từ: Hệ thống / cửa hàng"}
                          </p>
                        </div>
                        <span className={getStatusClass(item.isRead ? "READ" : "UNREAD")}>
                          {item.isRead ? "READ" : "UNREAD"}
                        </span>
                      </div>

                      <p className="notification-message">{item.message || "Không có nội dung thông báo"}</p>

                      <div className="notification-footer">
                        <span>{formatDate(item.createdAt)}</span>
                        <span className="notification-type">{item.type || "SYSTEM"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="profile-card">
              <div className="section-head">
                <h2>Lịch sử AI chẩn đoán gần đây</h2>
                <span>Bảng ai_diagnosis_logs + devices</span>
              </div>

              <div className="diagnosis-list">
                {recentDiagnosis.length === 0 ? (
                  <div className="notification-empty">Chưa có lịch sử AI chẩn đoán.</div>
                ) : (
                  recentDiagnosis.map((item) => (
                    <div className="diagnosis-card" key={item.id}>
                      <div className="diagnosis-top">
                        <h3>{item.deviceName}</h3>
                        <span>{formatDate(item.createdAt)}</span>
                      </div>

                      <div className="diagnosis-row">
                        <label>Mô tả của khách hàng</label>
                        <p>{item.userDescription || "Chưa có mô tả"}</p>
                      </div>

                      <div className="diagnosis-row">
                        <label>Kết quả AI dự đoán</label>
                        <p>{item.aiDiagnosis || "Chưa có kết quả"}</p>
                      </div>

                      <div className="diagnosis-row">
                        <label>Chi phí ước tính</label>
                        <p className="price-text">{formatMoney(item.estimatedPrice)}</p>
                      </div>
                    </div>
                  ))
                )}
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
                <div className="quick-item"><span>Yêu cầu đang xử lý</span><strong>{stats.inProgressRequests}</strong></div>
                <div className="quick-item"><span>Báo giá chờ phản hồi</span><strong>{stats.quotedRequests}</strong></div>
                <div className="quick-item"><span>Thanh toán chờ xử lý</span><strong>{stats.pendingPayments}</strong></div>
                <div className="quick-item"><span>Chẩn đoán AI đã dùng</span><strong>{stats.aiDiagnosisCount}</strong></div>
                <div className="quick-item"><span>Thông báo chưa đọc</span><strong>{stats.unreadNotifications}</strong></div>
              </div>
            </section>

            <section className="profile-card">
              <div className="section-head">
                <h2>Hoạt động gần đây</h2>
                <span>Timeline người dùng</span>
              </div>

              <div className="activity-list">
                {recentActivities.length === 0 ? (
                  <div className="notification-empty">Chưa có hoạt động nào.</div>
                ) : (
                  recentActivities.map((item) => (
                    <div className="activity-item" key={item.id}>
                      <div className="activity-dot"></div>
                      <div className="activity-content">
                        <p>{item.title}</p>
                        <div className="activity-meta">
                          <span>{formatDate(item.time)}</span>
                          <span className={getStatusClass(item.status)}>{item.status}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
