import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ChooseRole() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState("user");
  const [loading, setLoading] = useState(false);

  const userData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch (error) {
      return null;
    }
  }, []);

  const token = localStorage.getItem("token");

  const handleContinue = async () => {
    if (!userData?.id) {
      alert("Không tìm thấy thông tin tài khoản. Vui lòng đăng nhập lại.");
      navigate("/login");
      return;
    }

    if (!token) {
      alert("Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.");
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      // Đổi endpoint này theo backend của bạn
      const response = await fetch("http://localhost:5000/api/auth/select-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Không thể cập nhật vai trò");
      }

      const updatedUser = {
        ...userData,
        role: selectedRole,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));

      if (selectedRole === "store") {
        navigate("/store");
      } else {
        navigate("/home");
      }
    } catch (error) {
      console.error("Lỗi chọn vai trò:", error);
      alert(error.message || "Có lỗi xảy ra khi cập nhật vai trò.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f8fbff 0%, #f1f5f9 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "920px",
          backgroundColor: "#ffffff",
          borderRadius: "24px",
          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.12)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "32px 32px 20px",
            textAlign: "center",
            borderBottom: "1px solid #e2e8f0",
            background:
              "radial-gradient(circle at top right, rgba(37,99,235,0.08), transparent 30%)",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              margin: "0 auto 18px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #2563eb, #60a5fa)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "24px",
            }}
          >
            IEMS
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              color: "#0f172a",
              fontWeight: 800,
            }}
          >
            Chọn vai trò của bạn
          </h1>

          <p
            style={{
              margin: "10px auto 0",
              maxWidth: "620px",
              color: "#64748b",
              fontSize: "16px",
              lineHeight: 1.6,
            }}
          >
            Đây là lần đầu bạn đăng nhập bằng Google. Hãy chọn vai trò để hệ thống
            đưa bạn đến đúng khu vực sử dụng.
          </p>
        </div>

        <div
          style={{
            padding: "32px",
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "22px",
          }}
        >
          <div
            onClick={() => setSelectedRole("user")}
            style={{
              border:
                selectedRole === "user"
                  ? "2px solid #2563eb"
                  : "1px solid #e2e8f0",
              borderRadius: "22px",
              padding: "24px",
              cursor: "pointer",
              background:
                selectedRole === "user"
                  ? "linear-gradient(180deg, #eff6ff, #ffffff)"
                  : "#ffffff",
              boxShadow:
                selectedRole === "user"
                  ? "0 16px 36px rgba(37, 99, 235, 0.12)"
                  : "none",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "#dbeafe",
                color: "#1d4ed8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                marginBottom: "16px",
              }}
            >
              👤
            </div>

            <h2
              style={{
                margin: "0 0 10px",
                fontSize: "22px",
                color: "#0f172a",
              }}
            >
              Người dùng
            </h2>

            <p
              style={{
                margin: "0 0 18px",
                color: "#64748b",
                lineHeight: 1.6,
              }}
            >
              Tìm cửa hàng, gửi yêu cầu sửa chữa, theo dõi tiến độ và nhận hỗ trợ.
            </p>

            <ul
              style={{
                margin: 0,
                paddingLeft: "18px",
                color: "#334155",
                lineHeight: 1.8,
              }}
            >
              <li>Tạo yêu cầu sửa chữa</li>
              <li>Tìm cửa hàng phù hợp</li>
              <li>Theo dõi trạng thái đơn</li>
            </ul>
          </div>

          <div
            onClick={() => setSelectedRole("store")}
            style={{
              border:
                selectedRole === "store"
                  ? "2px solid #2563eb"
                  : "1px solid #e2e8f0",
              borderRadius: "22px",
              padding: "24px",
              cursor: "pointer",
              background:
                selectedRole === "store"
                  ? "linear-gradient(180deg, #eff6ff, #ffffff)"
                  : "#ffffff",
              boxShadow:
                selectedRole === "store"
                  ? "0 16px 36px rgba(37, 99, 235, 0.12)"
                  : "none",
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "#dbeafe",
                color: "#1d4ed8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                marginBottom: "16px",
              }}
            >
              🏪
            </div>

            <h2
              style={{
                margin: "0 0 10px",
                fontSize: "22px",
                color: "#0f172a",
              }}
            >
              Cửa hàng
            </h2>

            <p
              style={{
                margin: "0 0 18px",
                color: "#64748b",
                lineHeight: 1.6,
              }}
            >
              Quản lý hồ sơ cửa hàng, nhận đơn sửa chữa, cập nhật tiến độ và sản phẩm.
            </p>

            <ul
              style={{
                margin: 0,
                paddingLeft: "18px",
                color: "#334155",
                lineHeight: 1.8,
              }}
            >
              <li>Quản lý hồ sơ cửa hàng</li>
              <li>Nhận và xử lý đơn</li>
              <li>Quản lý gói quảng bá, dịch vụ</li>
            </ul>
          </div>
        </div>

        <div
          style={{
            padding: "0 32px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <p style={{ margin: 0, color: "#64748b" }}>
            Vai trò đã chọn:{" "}
            <strong style={{ color: "#0f172a" }}>
              {selectedRole === "store" ? "Cửa hàng" : "Người dùng"}
            </strong>
          </p>

          <button
            onClick={handleContinue}
            disabled={loading}
            style={{
              border: "none",
              borderRadius: "14px",
              padding: "14px 24px",
              background: "linear-gradient(135deg, #2563eb, #3b82f6)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "15px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              minWidth: "180px",
            }}
          >
            {loading ? "Đang lưu..." : "Tiếp tục"}
          </button>
        </div>
      </div>
    </div>
  );
}