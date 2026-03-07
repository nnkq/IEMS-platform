import { useState } from "react";
import { forgotPassword } from "../api/authApi";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await forgotPassword({ email });
      setMessage(res.data.message || "Đã gửi email khôi phục mật khẩu");
    } catch (error) {
      setMessage(error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  return (
    <div className="container">
      <form className="card form" onSubmit={handleSubmit}>
        <h2>Quên mật khẩu</h2>

        <input
          type="email"
          placeholder="Nhập email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button type="submit">Gửi yêu cầu</button>

        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
}