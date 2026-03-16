import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function GoogleSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Lấy token và thông tin user từ thanh địa chỉ (URL)
    const token = searchParams.get("token");
    const userString = searchParams.get("user");

    if (token) {
      // 1. Lưu token để chứng minh đã đăng nhập
      localStorage.setItem("token", token);
      
      let userRole = "user"; // Mặc định nếu không có gì thì làm user thường

      // 2. Nếu có cục 'user' từ Backend gửi sang
      if (userString) {
        try {
          // Dịch mã chuỗi user thành Object và lưu vào máy
          const userData = JSON.parse(decodeURIComponent(userString));
          localStorage.setItem("user", JSON.stringify(userData));
          
          // Lấy cái Role ra để rẽ nhánh
          userRole = userData.role;
        } catch (error) {
          console.error("Lỗi khi đọc thông tin user từ URL:", error);
        }
      }

      // 3. Đưa user về đúng "nhà" của mình
      if (userRole?.toLowerCase() === "store") {
        navigate("/store");
      } else if (userRole?.toLowerCase() === "admin") {
        navigate("/admin");
      } else {
        navigate("/home");
      }
      
    } else {
      navigate("/login");
    }
  }, [searchParams, navigate]);

  return (
    <div className="container">
      <div className="card" style={{ padding: "40px", textAlign: "center", maxWidth: "500px", margin: "100px auto" }}>
        <h2>Đang xác thực tài khoản Google... 🔄</h2>
        <p style={{ color: "#64748b" }}>Hệ thống đang chuyển hướng bạn vào trang quản lý...</p>
      </div>
    </div>
  );
}