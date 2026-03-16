import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import GoogleSuccess from "./pages/GoogleSuccess";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import StoreDashboard from "./pages/StoreDashboard"; // <-- Mình đã thêm import ở đây
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
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/google-success" element={<GoogleSuccess />} />

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
    </Routes>
  );
}

export default App;