import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function GoogleSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    const userString = searchParams.get("user");

    if (!token) {
      navigate("/login");
      return;
    }

    localStorage.setItem("token", token);

    let userData = null;

    if (userString) {
      try {
        userData = JSON.parse(decodeURIComponent(userString));
        localStorage.setItem("user", JSON.stringify(userData));
      } catch (error) {
        console.error("Lỗi khi đọc thông tin user từ URL:", error);
      }
    }

    // ===== FLOW MỚI =====
    // Nếu chưa có role => xem như đăng ký lần đầu bằng Google
    if (!userData?.role || userData.role.trim() === "") {
      navigate("/choose-role");
      return;
    }

    const userRole = userData.role.toLowerCase();

    if (userRole === "store") {
      navigate("/store");
    } else if (userRole === "admin") {
      navigate("/admin");
    } else {
      navigate("/home");
    }
  }, [searchParams, navigate]);

  return (
    <div className="container">
      <div
        className="card"
        style={{
          padding: "40px",
          textAlign: "center",
          maxWidth: "500px",
          margin: "100px auto",
        }}
      >
        <h2>Đang xác thực tài khoản Google... 🔄</h2>
        <p style={{ color: "#64748b" }}>
          Hệ thống đang kiểm tra tài khoản và chuyển hướng...
        </p>
      </div>
    </div>
  );
}