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

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      setMessage("Đăng nhập thành công");

      const userRole = res.data.user?.role?.toLowerCase();

      if (userRole === "store") {
        navigate("/store");
      } else if (userRole === "admin") {
        navigate("/admin");
      } else if (userRole === "user") {
        navigate("/home");
      } else {
        navigate("/choose-role");
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