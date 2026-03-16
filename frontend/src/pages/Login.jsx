import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../api/authApi";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await loginUser(form);

      // Lưu token và thông tin user vào localStorage
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      setMessage("Đăng nhập thành công");

      // Lấy role từ dữ liệu API trả về
      const userRole = res.data.user.role; 

      // Ép kiểu về chữ thường để so sánh (khắc phục lỗi 'STORE' vs 'store')
      if (userRole?.toLowerCase() === "store") {
        navigate("/store"); // Chuyển đến trang quản lý của Store
      } else if (userRole?.toLowerCase() === "admin") {
        navigate("/admin"); // Chuẩn bị sẵn cho trang Admin
      } else {
        navigate("/home");  // Mặc định là User bình thường
      }

    } catch (error) {
      setMessage(error.response?.data?.message || "Đăng nhập thất bại");
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:5000/api/auth/google";
  };

  return (
    <div className="container">
      <form className="card form" onSubmit={handleSubmit}>
        <h2>Đăng nhập</h2>

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />

        <input
          type="password"
          name="password"
          placeholder="Mật khẩu"
          value={form.password}
          onChange={handleChange}
        />

        <button type="submit">Đăng nhập</button>

        <button
          type="button"
          className="google-btn"
          onClick={handleGoogleLogin}
        >
          Đăng nhập bằng Google
        </button>

        {message && <p className="message">{message}</p>}

        <p>
          <Link to="/forgot-password">Quên mật khẩu?</Link>
        </p>

        <p>
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
      </form>
    </div>
  );
}