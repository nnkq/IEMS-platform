import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import GoogleSuccess from "./pages/GoogleSuccess";
import ChooseRole from "./pages/ChooseRole";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import StoreDashboard from "./pages/StoreDashboard"; 
import TechnicianDashboard from './pages/TechnicianDashboard';
import TechnicianLogin from './pages/TechnicianLogin';
import "./App.css";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      
      {/* 🚀 ĐÃ THÊM: Route Đăng nhập riêng cho Kỹ thuật viên (Không cần PrivateRoute) */}
      <Route path="/tech-login" element={<TechnicianLogin />} />
      
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/google-success" element={<GoogleSuccess />} />
      <Route path="/choose-role" element={<ChooseRole />} />
      <Route
        path="/home"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />

      {/* <-- Mình đã thêm Route bảo vệ cho Store ở đây --> */}
      <Route
        path="/store"
        element={
          <PrivateRoute>
            <StoreDashboard />
          </PrivateRoute>
        }
      />

      {/* 🚀 ĐÃ THÊM: Route bảo vệ cho Không gian làm việc của Kỹ thuật viên */}
      <Route
        path="/technician"
        element={
          <PrivateRoute>
            <TechnicianDashboard />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default App;