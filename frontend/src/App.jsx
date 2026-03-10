import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import GoogleSuccess from "./pages/GoogleSuccess";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import "./App.css";

function App() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setMenuOpen(false);
    navigate("/login");
    window.location.reload();
  };

  return (
    <div>
      <nav className="navbar">
        <div className="nav-left">
          <Link to="/" className="logo">
            IEMS Platform
          </Link>

          <div className="nav-links">
            <Link to="/">Trang chủ</Link>
            <Link to="/repair-request">Yêu cầu sửa chữa</Link>
            <Link to="/chatbot">Chatbot AI</Link>
            <Link to="/stores">Cửa hàng</Link>
          </div>
        </div>

        <div className="nav-right">
          {!currentUser ? (
            <div className="guest-actions">
              <Link to="/login" className="nav-btn login-btn">
                Đăng nhập
              </Link>
              <Link to="/register" className="nav-btn register-btn">
                Đăng ký
              </Link>
            </div>
          ) : (
            <div className="user-menu" ref={menuRef}>
              <button
                className="avatar-button"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <img
                  src={
                    currentUser.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      currentUser.fullName || currentUser.name || "User"
                    )}&background=2563eb&color=fff`
                  }
                  alt="avatar"
                  className="avatar"
                />
                <div className="user-info">
                  <span className="user-name">
                    {currentUser.fullName || currentUser.name || "Khách hàng"}
                  </span>
                  <span className="user-role">Khách hàng</span>
                </div>
              </button>

              {menuOpen && (
                <div className="dropdown-menu">
                  <Link to="/profile" onClick={() => setMenuOpen(false)}>
                    Thông tin cá nhân
                  </Link>
                  <Link to="/my-requests" onClick={() => setMenuOpen(false)}>
                    Yêu cầu sửa chữa của tôi
                  </Link>
                  <Link to="/chatbot" onClick={() => setMenuOpen(false)}>
                    Chatbot AI
                  </Link>
                  <Link to="/settings" onClick={() => setMenuOpen(false)}>
                    Cài đặt
                  </Link>
                  <button onClick={handleLogout} className="logout-btn">
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/google-success" element={<GoogleSuccess />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </div>
  );
}

export default App;