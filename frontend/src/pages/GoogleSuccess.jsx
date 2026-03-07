import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function GoogleSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      localStorage.setItem("token", token);
      navigate("/");
    } else {
      navigate("/login");
    }
  }, [searchParams, navigate]);

  return (
    <div className="container">
      <div className="card">
        <h2>Đang đăng nhập bằng Google...</h2>
      </div>
    </div>
  );
}