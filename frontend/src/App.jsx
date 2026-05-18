import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
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
import AdminDashboard from './pages/AdminDashboard'; // Import AdminDashboard
import "./App.css";

import { Toaster, toast } from 'react-hot-toast';
import { chatSocket } from "./api/chatSocket";

const safeParseJson = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch (error) {
    return null;
  }
};

const clearUserSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  sessionStorage.removeItem("activeAuthToken");
};

const clearTechnicianSession = () => {
  localStorage.removeItem("techUser");
  localStorage.removeItem("techToken");
  sessionStorage.removeItem("activeTechToken");
};

function AuthLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#334155",
        fontFamily: "Inter, system-ui, sans-serif",
        fontWeight: 700,
      }}
    >
      Đang kiểm tra đăng nhập...
    </div>
  );
}

function PrivateRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const activeToken = sessionStorage.getItem("activeAuthToken");
  const cachedUser = safeParseJson(localStorage.getItem("user"));
  const [authState, setAuthState] = useState({
    loading: true,
    user: null,
  });

  useEffect(() => {
    let active = true;

    const verifyLogin = async () => {
      if (!token || !activeToken || activeToken !== token || !cachedUser?.id) {
        clearUserSession();
        if (active) setAuthState({ loading: false, user: null });
        return;
      }

      try {
        const response = await fetch("/api/users/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Invalid session");
        }

        const data = await response.json();
        const verifiedUser = {
          ...cachedUser,
          id: data.id || cachedUser.id,
          name: data.name || cachedUser.name,
          email: data.email || cachedUser.email,
          phone: data.phone ?? cachedUser.phone,
          role: data.role || cachedUser.role,
          status: data.status || cachedUser.status,
        };

        localStorage.setItem("user", JSON.stringify(verifiedUser));
        if (active) setAuthState({ loading: false, user: verifiedUser });
      } catch (error) {
        clearUserSession();
        if (active) setAuthState({ loading: false, user: null });
      }
    };

    verifyLogin();

    return () => {
      active = false;
    };
  }, [token, activeToken, cachedUser?.id]);

  if (authState.loading) return <AuthLoading />;

  const user = authState.user;

  if (!user?.id) {
    return <Navigate to="/login" replace />;
  }

  const role = String(user.role || "").toLowerCase();
  const normalizedRoles = allowedRoles?.map((item) => String(item).toLowerCase());

  if (normalizedRoles?.length && !normalizedRoles.includes(role)) {
    clearUserSession();
    return <Navigate to="/login" replace />;
  }

  return children;
}

function TechnicianPrivateRoute({ children }) {
  const techToken = localStorage.getItem("techToken");
  const activeTechToken = sessionStorage.getItem("activeTechToken");
  const techUser = safeParseJson(localStorage.getItem("techUser"));
  const [authState, setAuthState] = useState({
    loading: true,
    allowed: false,
  });

  useEffect(() => {
    let active = true;

    const verifyTechnician = async () => {
      if (!techToken || !activeTechToken || activeTechToken !== techToken || !techUser?.id) {
        clearTechnicianSession();
        if (active) setAuthState({ loading: false, allowed: false });
        return;
      }

      try {
        const response = await fetch("/api/technician/me", {
          headers: {
            Authorization: `Bearer ${techToken}`,
          },
        });

        if (!response.ok) throw new Error("Invalid technician session");

        const data = await response.json();
        if (!data.tech?.id || Number(data.tech.id) !== Number(techUser.id)) {
          throw new Error("Technician mismatch");
        }

        localStorage.setItem("techUser", JSON.stringify(data.tech));
        if (active) setAuthState({ loading: false, allowed: true });
      } catch (error) {
        clearTechnicianSession();
        if (active) setAuthState({ loading: false, allowed: false });
      }
    };

    verifyTechnician();

    return () => {
      active = false;
    };
  }, [techToken, activeTechToken, techUser?.id]);

  if (authState.loading) return <AuthLoading />;

  if (!authState.allowed) {
    return <Navigate to="/tech-login" replace />;
  }

  return children;
}

function App() {
  useEffect(() => {
    // Join socket room
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.id) {
          chatSocket.emit("chat:join-user", user.id);
        }
      } catch (e) {}
    }

    // Listen for realtime notifications
    const handleNewNotification = (payload) => {
      toast(payload.title + ": " + payload.message, {
        icon: "🔔",
        duration: 5000,
      });
      // Optionally dispatch an event if we want components like Home.jsx to reload notifications
      window.dispatchEvent(new Event("reload-notifications"));
    };

    const handleDataChanged = (payload) => {
      window.dispatchEvent(
        new CustomEvent("realtime:data-changed", {
          detail: payload,
        })
      );
      window.dispatchEvent(new Event("reload-notifications"));
    };

    chatSocket.on("notification:new", handleNewNotification);
    chatSocket.on("data:changed", handleDataChanged);

    return () => {
      chatSocket.off("notification:new", handleNewNotification);
      chatSocket.off("data:changed", handleDataChanged);
    };
  }, []);

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* 🚀 ĐÃ THÊM: Route Đăng nhập riêng cho Kỹ thuật viên (Không cần PrivateRoute) */}
        <Route path="/tech-login" element={<TechnicianLogin />} />
        
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/google-success" element={<GoogleSuccess />} />
        <Route
          path="/choose-role"
          element={
            <PrivateRoute>
              <ChooseRole />
            </PrivateRoute>
          }
        />
        
        <Route
          path="/home"
          element={
            <PrivateRoute allowedRoles={["user"]}>
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

        <Route
          path="/store"
          element={
            <PrivateRoute allowedRoles={["store"]}>
              <StoreDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/technician"
          element={
            <TechnicianPrivateRoute>
              <TechnicianDashboard />
            </TechnicianPrivateRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <PrivateRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
