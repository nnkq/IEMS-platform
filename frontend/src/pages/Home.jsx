import { Link } from "react-router-dom";

export default function Home() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.reload();
  };

  return (
    <div className="home-page">
      <div className="hero-card">
        <div className="hero-badge">IEMS PLATFORM</div>

        <h1 className="hero-title">
          Nền tảng kết nối người dùng với cửa hàng sửa chữa thiết bị
        </h1>

        <p className="hero-desc">
          Đăng yêu cầu sửa chữa, nhận báo giá từ cửa hàng, theo dõi tiến độ và
          quản lý đơn hàng ngay trên một hệ thống duy nhất.
        </p>

        {token ? (
          <div className="user-box">
            <h2>Xin chào, {user?.name || "Người dùng"} 👋</h2>
            <p>
              Bạn đã đăng nhập với email: <strong>{user?.email}</strong>
            </p>
            <p>
              Vai trò: <strong>{user?.role}</strong>
            </p>

            <div className="hero-actions">
              <button className="primary-btn">Tạo yêu cầu sửa chữa</button>
              <button className="secondary-btn" onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
          </div>
        ) : (
          <div className="guest-box">
            <p className="status-text">
              Chào mừng bạn đến với hệ thống IEMS. Hãy đăng nhập hoặc tạo tài
              khoản để bắt đầu.
            </p>

            <div className="hero-actions">
              <Link to="/login" className="link-btn primary-btn">
                Đăng nhập
              </Link>
              <Link to="/register" className="link-btn secondary-btn">
                Đăng ký
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}