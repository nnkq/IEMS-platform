import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Home.css";
import { getHomeDashboard, searchHome } from "../api/homeApi";
import { createRepairRequest, getMyRepairRequests } from "../api/repairApi";

const pageMeta = {
  home: {
    title: "Trang chủ",
    subtitle: "Tổng quan ưu tiên",
  },
  request: {
    title: "Yêu cầu sửa chữa",
    subtitle: "Tạo yêu cầu mới với form được chia cụm rõ ràng và dễ dùng hơn.",
  },
  stores: {
    title: "Cửa hàng",
    subtitle: "So sánh cửa hàng bằng card lớn, rõ rating, dịch vụ và khoảng cách.",
  },
  tracking: {
    title: "Theo dõi",
    subtitle: "Xem tiến độ xử lý, báo giá, ETA và những việc cần phản hồi.",
  },
  chatbot: {
    title: "Chatbot AI",
    subtitle: "Màn hình hội thoại gọn, sạch và có prompt gợi ý sẵn.",
  },
  profile: {
    title: "Hồ sơ",
    subtitle: "Quản lý tài khoản, thông báo, địa chỉ và cài đặt cá nhân.",
  },
};

const navItems = [
  { key: "home", icon: "⌂", title: "Trang chủ", subtitle: "Tổng quan ưu tiên" },
  { key: "request", icon: "✎", title: "Yêu cầu sửa chữa", subtitle: "Tạo request mới" },
  { key: "stores", icon: "⌘", title: "Cửa hàng", subtitle: "So sánh và lựa chọn" },
  { key: "tracking", icon: "◔", title: "Theo dõi", subtitle: "Progress và báo giá" },
  { key: "chatbot", icon: "✦", title: "Chatbot AI", subtitle: "Chẩn đoán sơ bộ" },
  { key: "profile", icon: "☺", title: "Hồ sơ", subtitle: "Tài khoản và cài đặt" },
];

const quickPrompts = [
  "Màn hình iPhone bị sọc xanh và cảm ứng chập chờn",
  "Laptop nóng, quạt quay to rồi tự tắt",
  "Điện thoại vào nước, loa nhỏ và mic rè",
  "Robot hút bụi không sạc được và dừng sau 5 phút",
];

function formatVND(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return "Chưa có";
  return new Date(value).toLocaleString("vi-VN");
}

function statusLabel(status) {
  switch (status) {
    case "OPEN":
    case "PENDING":
      return "Đang chờ duyệt";
    case "QUOTED":
      return "Đã có báo giá";
    case "IN_PROGRESS":
      return "Đang sửa chữa ⚙️";
    case "COMPLETED":
      return "Đã hoàn thành ✅";
    case "CANCELLED":
      return "Đã hủy";
    case "ACCEPTED":
      return "Đã chấp nhận";
    case "REJECTED":
      return "Bị từ chối ❌";
    default:
      return status || "Không rõ";
  }
}

function statusClass(status) {
  if (status === "IN_PROGRESS") return "status-warning";
  if (status === "COMPLETED") return "status-success"; 
  if (status === "REJECTED") return "status-error";
  return "status-accent";
}

function getAiReply(text) {
  const input = text.toLowerCase();

  if (input.includes("màn hình")) {
    return "Triệu chứng này thường liên quan đến màn hình hoặc cáp kết nối. Bạn nên sao lưu dữ liệu và ưu tiên gửi yêu cầu kiểm tra màn hình.";
  }

  if (input.includes("nóng") || input.includes("quạt")) {
    return "Khả năng cao máy đang gặp vấn đề tản nhiệt: bụi bẩn, keo tản nhiệt hoặc quạt yếu. Nên vệ sinh sớm để tránh hư hỏng linh kiện khác.";
  }

  if (input.includes("pin") || input.includes("sạc")) {
    return "Tình huống này có thể liên quan đến pin chai, chân sạc hoặc mạch sạc. Bạn nên ưu tiên cửa hàng có nhóm dịch vụ nguồn và pin.";
  }

  return "Tôi đã ghi nhận triệu chứng của bạn. Ở bước tiếp theo có thể nối AI thật để trả về chẩn đoán, độ khẩn cấp và gợi ý cửa hàng phù hợp.";
}

function buildInitials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("") || "U"
  );
}

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 🚀 ĐÃ THÊM: STATE CHO POPUP CHI TIẾT ĐƠN Ở TAB TRACKING
  const [selectedTrackedRequest, setSelectedTrackedRequest] = useState(null);

  const [selectedStoreDetail, setSelectedStoreDetail] = useState(null);
  const [storeProducts, setStoreProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const handleViewStoreDetail = async (store) => {
    setSelectedStoreDetail(store);
    setLoadingProducts(true);
    try {
      const storeOwnerId = store.user_id || store.id; 
      const res = await fetch(`http://localhost:5000/api/products/${storeOwnerId}`);
      const data = await res.json();
      setStoreProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Lỗi lấy sản phẩm cửa hàng:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleOpenStoreSelection = () => {
    if (!issueTitle.trim() || !description.trim()) {
      alert("Vui lòng nhập tiêu đề và mô tả lỗi");
      return;
    }

    if (userLocation.lat == null || userLocation.lng == null) {
      alert("Vui lòng bấm 'Lấy vị trí hiện tại' trước");
      return;
    }

    setIsModalOpen(true);
  };

  const submitRepairRequestWithStore = async (selectedStoreId) => {
    try {
      const payload = {
        device_id: null,
        store_id: selectedStoreId,
        title: issueTitle.trim(),
        description: description.trim(),
        budget: budget || null,
        location: address || null,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        phone: phone || null,
        desired_date: desiredDate || null,
        service_mode: serviceMode || null,
        device_type: deviceType || null,
        brand: brand || null,
        model: model || null,
        symptoms: symptoms.join(", "),
      };

      console.log("payload:", payload);

      const res = await createRepairRequest(payload);
      console.log("create result:", res.data);

      await loadTrackingRequests();

      alert(res.data?.message || "Tạo yêu cầu sửa chữa thành công!");

      resetForm();
      setIsModalOpen(false); 
      setActivePage("tracking");
    } catch (error) {
      console.error("Create request error:", error);
      console.error("Response data:", error.response?.data);
      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Không thể tạo yêu cầu sửa chữa"
      );
    }
  };

  const loadTrackingRequests = async (isBackground = false) => {
    try {
      if (!isBackground) setTrackingLoading(true);
      setTrackingError("");

      const res = await getMyRepairRequests();
      setTrackingRequests(res.data?.requests || []);
    } catch (error) {
      console.error("Lỗi lấy danh sách yêu cầu:", error);
      if (!isBackground) {
        setTrackingError(
          error.response?.data?.message || "Không lấy được danh sách yêu cầu"
        );
      }
    } finally {
      if (!isBackground) setTrackingLoading(false);
    }
  };

  const [activePage, setActivePage] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const [userLocation, setUserLocation] = useState({
    lat: null,
    lng: null,
  });
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchResult, setSearchResult] = useState({
    repairRequests: [],
    stores: [],
    devices: [],
  });
  const [searchError, setSearchError] = useState("");

  const [deviceType, setDeviceType] = useState("Điện thoại");
  const [brand, setBrand] = useState("Apple");
  const [model, setModel] = useState("");
  const [issueTitle, setIssueTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState(1000000);
  const [desiredDate, setDesiredDate] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [serviceMode, setServiceMode] = useState("Mang đến cửa hàng");
  const [symptoms, setSymptoms] = useState(["Màn hình", "Cảm ứng"]);

  const [trackingRequests, setTrackingRequests] = useState([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      role: "ai",
      title: "IEMS AI",
      time: "08:30",
      text: "Xin chào, tôi có thể giúp bạn sơ bộ chẩn đoán lỗi thiết bị và gợi ý hướng xử lý phù hợp.",
    },
    {
      role: "user",
      title: "Bạn",
      time: "08:31",
      text: "iPhone 12 của tôi bị sọc xanh ở mép trái và cảm ứng lúc được lúc không.",
    },
    {
      role: "ai",
      title: "IEMS AI",
      time: "08:31",
      text: "Tình trạng này thường liên quan đến màn hình OLED hoặc cáp kết nối bị lỏng sau va đập. Bạn nên sao lưu dữ liệu và tránh tiếp tục đè nén màn hình trước khi mang đi kiểm tra.",
    },
  ]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setDashboardLoading(true);
        setDashboardError("");

        const res = await getHomeDashboard();
        setDashboardData(res.data);
        setProfileForm({
          name: res.data?.user?.name || "",
          phone: res.data?.user?.phone || "",
        });
      } catch (error) {
        console.error("Lỗi lấy dữ liệu trang chủ:", error);
        setDashboardError(
          error.response?.data?.message || "Không lấy được dữ liệu backend"
        );
      } finally {
        setDashboardLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setSearchError("");

        if (!searchText.trim()) {
          setSearchResult({
            repairRequests: [],
            stores: [],
            devices: [],
          });
          return;
        }

        const res = await searchHome(searchText);
        setSearchResult({
          repairRequests: res.data.repairRequests || [],
          stores: res.data.stores || [],
          devices: res.data.devices || [],
        });
      } catch (error) {
        console.error("Lỗi search home:", error);
        setSearchError(error.response?.data?.message || "Không tìm kiếm được");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    let interval;
    if (activePage === "tracking") {
      loadTrackingRequests(); 
      
      interval = setInterval(() => {
        loadTrackingRequests(true);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [activePage]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    sessionStorage.clear();
    window.location.href = "/login";
  };

  const previewBudget = useMemo(() => {
    const min = Math.max(Number(budget || 0) * 0.8, 200000);
    const max = Math.max(Number(budget || 0) * 1.25, min + 150000);
    return `${formatVND(min)} - ${formatVND(max)}`;
  }, [budget]);

  const previewModel = model.trim() || "Chưa nhập model";
  const previewSymptoms = symptoms.length ? symptoms.join(", ") : "Chưa chọn";

  const counters = dashboardData?.counters || {};
  const recentRequests = dashboardData?.recentRequests || [];
  const pendingQuotes = dashboardData?.pendingQuotes || [];
  const savedDevices = dashboardData?.savedDevices || [];
  const verifiedStores = dashboardData?.verifiedStores || [];
  const user = dashboardData?.user || {};
  const header = dashboardData?.header || {};

  const openPage = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
    setSelectedStoreDetail(null); 
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleSymptom = (value) => {
    setSymptoms((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const sendChatMessage = (text) => {
    const clean = text.trim();
    if (!clean) return;

    setChatMessages((prev) => [
      ...prev,
      { role: "user", title: "Bạn", time: "Bây giờ", text: clean },
      { role: "ai", title: "IEMS AI", time: "Bây giờ", text: getAiReply(clean) },
    ]);
    setChatInput("");
  };

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    try {
      setProfileSaving(true);
      setProfileMessage("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Bạn chưa đăng nhập");
      }

      const response = await fetch("http://localhost:5000/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileForm.name,
          phone: profileForm.phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Cập nhật hồ sơ thất bại");
      }

      const updatedUserFromApi = data.user || data.profile?.user || {};
      const mergedUser = {
        ...user,
        ...updatedUserFromApi,
        name: updatedUserFromApi.name || profileForm.name,
        phone: updatedUserFromApi.phone ?? profileForm.phone,
        initials:
          updatedUserFromApi.initials ||
          buildInitials(updatedUserFromApi.name || profileForm.name || user.name),
      };

      setDashboardData((prev) => ({
        ...prev,
        user: mergedUser,
      }));

      const oldUser = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...oldUser,
          ...mergedUser,
        })
      );

      setProfileForm({
        name: mergedUser.name || "",
        phone: mergedUser.phone || "",
      });

      setProfileMessage("Cập nhật hồ sơ thành công");
      setIsEditingProfile(false);
    } catch (error) {
      setProfileMessage(error.message || "Có lỗi khi cập nhật hồ sơ");
    } finally {
      setProfileSaving(false);
    }
  };

  const resetForm = () => {
    setDeviceType("Điện thoại");
    setBrand("Apple");
    setModel("");
    setIssueTitle("");
    setDescription("");
    setBudget(1000000);
    setDesiredDate("");
    setPhone("");
    setAddress("");
    setServiceMode("Mang đến cửa hàng");
    setSymptoms(["Màn hình", "Cảm ứng"]);
  };

  const getCurrentLocation = () => {
    if (loadingLocation) return;

    if (!navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ GPS");
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setUserLocation({ lat, lng });

        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`
          );

          const data = await res.json();

          let addressText = [data.locality, data.principalSubdivision, data.countryName]
            .filter(Boolean)
            .join(", ");

          if (!addressText) {
            addressText = `${lat}, ${lng}`;
          }

          setAddress(addressText);
          alert("Đã lấy vị trí thành công!");
        } catch (err) {
          console.error("Lỗi API địa chỉ:", err);
          setAddress(`${lat}, ${lng}`);
          alert("Lấy được vị trí nhưng không xác định được địa chỉ");
        }

        setLoadingLocation(false);
      },
      (err) => {
        console.error("GPS error:", err);

        if (err.code === 1) {
          alert("Bạn chưa cho phép truy cập vị trí");
        } else if (err.code === 2) {
          alert("Không xác định được vị trí");
        } else {
          alert("Lỗi GPS");
        }

        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const fetchNearbyStores = async () => {
    if (!userLocation.lat) return;

    const res = await fetch("http://localhost:5000/api/map/stores/nearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userLocation),
    });

    const data = await res.json();
    console.log("Stores gần:", data);
  };

  return (
    <div className="iems-root">
      <div
        className={`mobile-overlay ${sidebarOpen ? "show" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="app-shell">
        <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="brand-box">
            <div className="brand-mark">IEMS</div>
            <div className="brand-copy">
              <strong>User Portal</strong>
              <span>Nền tảng sửa chữa thiết bị</span>
            </div>
          </div>

          <div className="sidebar-group">
            <p className="sidebar-group-title">Điều hướng</p>
            <div className="nav-list">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  className={`nav-item ${activePage === item.key ? "active" : ""}`}
                  onClick={() => openPage(item.key)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-copy">
                    <strong>{item.title}</strong>
                    <span>{item.subtitle}</span>
                  </span>
                  <span className="nav-chevron">›</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="main-area">
          <div className="main-topbar">
            <div className="topbar-left">
              <button className="mobile-toggle" onClick={() => setSidebarOpen((v) => !v)}>
                ☰
              </button>
              <div className="topbar-copy">
                <h1>
                  {activePage === "home"
                    ? header.title || "Trang chủ"
                    : pageMeta[activePage].title}
                </h1>
                <p>
                  {activePage === "home"
                    ? header.subtitle || "Tổng quan ưu tiên"
                    : pageMeta[activePage].subtitle || ""}
                </p>
              </div>
            </div>

            <div className="topbar-actions">
              <label className="search-shell">
                <span>⌕</span>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder={header.searchPlaceholder || "Tìm yêu cầu, cửa hàng, thiết bị..."}
                />
              </label>

              <div className="user-menu" ref={menuRef}>
                <button
                  type="button"
                  className="avatar-button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  <div className="avatar">{user.initials || "U"}</div>
                  <div className="user-info">
                    <p className="user-name">{user.name || "Chưa có dữ liệu"}</p>
                    <p className="user-role">{user.roleLabel || "Chưa có vai trò"}</p>
                  </div>
                </button>

                {menuOpen && (
                  <div className="dropdown-menu">
                    <button type="button" className="logout-btn" onClick={handleLogout}>
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {dashboardLoading && <div className="note-banner">Đang tải dữ liệu backend...</div>}

          {dashboardError && (
            <div
              style={{
                marginBottom: 16,
                padding: 14,
                borderRadius: 16,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#b91c1c",
              }}
            >
              {dashboardError}
            </div>
          )}

          {searchError && (
            <div
              style={{
                marginBottom: 16,
                padding: 14,
                borderRadius: 16,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#b91c1c",
              }}
            >
              {searchError}
            </div>
          )}

          {searchText.trim() && (
            <div className="surface" style={{ marginBottom: 20 }}>
              <div className="section-head">
                <div>
                  <span className="eyebrow">KẾT QUẢ TÌM KIẾM</span>
                  <h3 className="section-title">Từ khóa: {searchText}</h3>
                </div>
              </div>

              <div className="home-layout">
                <div className="summary-box">
                  <div className="summary-list">
                    <div className="summary-row">
                      <span>Yêu cầu sửa chữa</span>
                      <strong>{searchResult.repairRequests.length}</strong>
                    </div>
                    {searchResult.repairRequests.map((item) => (
                      <div key={`req-${item.id}`} className="summary-row">
                        <span>{item.title}</span>
                        <strong>{item.device_name || statusLabel(item.status)}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="summary-box">
                  <div className="summary-list">
                    <div className="summary-row">
                      <span>Cửa hàng</span>
                      <strong>{searchResult.stores.length}</strong>
                    </div>
                    {searchResult.stores.map((item) => (
                      <div key={`store-${item.id}`} className="summary-row">
                        <span>{item.store_name}</span>
                        <strong>{item.address || "Không có địa chỉ"}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="summary-box">
                  <div className="summary-list">
                    <div className="summary-row">
                      <span>Thiết bị</span>
                      <strong>{searchResult.devices.length}</strong>
                    </div>
                    {searchResult.devices.map((item) => (
                      <div key={`device-${item.id}`} className="summary-row">
                        <span>{item.name}</span>
                        <strong>{item.category || "Thiết bị"}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePage === "home" && (
            <section className="page active">
              <div className="page-grid">
                <div className="hero-card">
                  <div className="hero-copy">
                    <span className="eyebrow">TỔNG QUAN NGƯỜI DÙNG</span>
                    <h2>Theo dõi dữ liệu thật từ backend ngay trên trang chủ.</h2>
                    <p>
                      Phần này đang lấy trực tiếp từ API dashboard. Nếu backend không có dữ liệu
                      thì giao diện sẽ hiện rỗng hoặc hiện lỗi thật, không còn dữ liệu mẫu che đi
                      nữa.
                    </p>

                    <div className="hero-actions">
                      <button className="btn btn-primary" onClick={() => openPage("request")}>
                        Tạo yêu cầu mới
                      </button>
                      <button className="btn btn-secondary" onClick={() => openPage("tracking")}>
                        Theo dõi tiến độ
                      </button>
                    </div>

                    <div className="glow-card">
                      <strong>Xin chào, {user.name || "người dùng"}.</strong>
                      <span className="muted">
                        Bạn có {counters.activeRequests || 0} yêu cầu đang xử lý,{" "}
                        {counters.pendingQuotes || 0} báo giá chờ phản hồi và{" "}
                        {counters.savedDevices || 0} thiết bị đã từng gửi sửa.
                      </span>
                    </div>
                  </div>

                  <div className="hero-side">
                    <div className="stat-grid">
                      <div className="stat-card">
                        <span>Tổng yêu cầu</span>
                        <strong>{String(counters.totalRequests || 0).padStart(2, "0")}</strong>
                        <div className="muted">Tất cả request của bạn</div>
                      </div>

                      <div className="stat-card">
                        <span>Đang xử lý</span>
                        <strong>{String(counters.activeRequests || 0).padStart(2, "0")}</strong>
                        <div className="muted">OPEN / QUOTED / IN_PROGRESS</div>
                      </div>

                      <div className="stat-card">
                        <span>Báo giá chờ phản hồi</span>
                        <strong>{String(counters.pendingQuotes || 0).padStart(2, "0")}</strong>
                        <div className="muted">Quote đang ở trạng thái PENDING</div>
                      </div>

                      <div className="stat-card">
                        <span>Cửa hàng đã xác minh</span>
                        <strong>{String(counters.verifiedStores || 0).padStart(2, "0")}</strong>
                        <div className="muted">Store approved trong hệ thống</div>
                      </div>

                      <div className="stat-card">
                        <span>Thiết bị đã lưu</span>
                        <strong>{String(counters.savedDevices || 0).padStart(2, "0")}</strong>
                        <div className="muted">Thiết bị từng tạo repair request</div>
                      </div>

                      <div className="stat-card">
                        <span>Thông báo chưa đọc</span>
                        <strong>
                          {String(counters.unreadNotifications || 0).padStart(2, "0")}
                        </strong>
                        <div className="muted">Notifications chưa đọc</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="home-layout">
                  <div className="surface">
                    <div className="section-head">
                      <div>
                        <span className="eyebrow">YÊU CẦU GẦN NHẤT</span>
                        <h3 className="section-title">Request và báo giá mới nhất</h3>
                      </div>
                      <button className="mini-link" onClick={() => openPage("tracking")}>
                        Xem theo dõi →
                      </button>
                    </div>

                    <div className="stack-16">
                      {recentRequests.length === 0 && pendingQuotes.length === 0 && (
                        <div className="note-banner">
                          Chưa có dữ liệu từ backend cho yêu cầu hoặc báo giá.
                        </div>
                      )}

                      {recentRequests.map((item) => (
                        <div key={`recent-${item.id}`} className="request-card">
                          <div className="request-card-head">
                            <div>
                              <span className={`status-chip ${statusClass(item.status)}`}>
                                {statusLabel(item.status)}
                              </span>
                              <h3>{item.device_name || item.title}</h3>
                              <p className="muted">
                                {item.title}
                                {item.description ? ` · ${item.description}` : ""}
                              </p>
                            </div>
                            <div className="align-right">
                              <strong>RQ-{item.id}</strong>
                              <div className="muted">{formatDateTime(item.created_at)}</div>
                            </div>
                          </div>

                          <div className="chips mt-14">
                            <span className="chip">
                              {item.device_category || "Thiết bị chưa phân loại"}
                            </span>
                            <span className="chip">
                              {item.budget ? formatVND(item.budget) : "Chưa có ngân sách"}
                            </span>
                            <span className="chip">{item.location || "Chưa có địa điểm"}</span>
                          </div>
                        </div>
                      ))}

                      {pendingQuotes.map((item) => (
                        <div key={`quote-${item.id}`} className="request-card">
                          <div className="request-card-head">
                            <div>
                              <span className="status-chip status-accent">
                                {statusLabel(item.status)}
                              </span>
                              <h3>{item.device_name || item.request_title}</h3>
                              <p className="muted">{item.request_title}</p>
                            </div>
                            <div className="align-right">
                              <strong>{item.store_name}</strong>
                              <div className="muted">{formatDateTime(item.created_at)}</div>
                            </div>
                          </div>

                          <div className="chips mt-14">
                            <span className="chip">
                              {item.price ? formatVND(item.price) : "Chưa có giá"}
                            </span>
                            <span className="chip">{item.estimated_time || "Chưa có ETA"}</span>
                            <span className="chip">Request #{item.request_id}</span>
                          </div>

                          {item.message && (
                            <div className="note-banner" style={{ marginTop: 14 }}>
                              {item.message}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="side-stack">
                    <div className="surface">
                      <div className="section-head">
                        <div>
                          <span className="eyebrow">THIẾT BỊ ĐÃ LƯU</span>
                          <h3 className="section-title">Thiết bị của bạn</h3>
                        </div>
                        <button className="mini-link" onClick={() => openPage("profile")}>
                          Hồ sơ →
                        </button>
                      </div>

                      <div className="summary-box">
                        <div className="summary-list">
                          {savedDevices.length === 0 && (
                            <div className="summary-row">
                              <span>Thiết bị</span>
                              <strong>Chưa có dữ liệu</strong>
                            </div>
                          )}

                          {savedDevices.map((item) => (
                            <div key={`saved-${item.id}`} className="summary-row">
                              <span>{item.category || "Thiết bị"}</span>
                              <strong>{item.name}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="surface">
                      <div className="section-head">
                        <div>
                          <span className="eyebrow">CỬA HÀNG ĐÃ XÁC MINH</span>
                          <h3 className="section-title">Gợi ý phù hợp</h3>
                        </div>
                        <button className="mini-link" onClick={() => openPage("stores")}>
                          Xem thêm →
                        </button>
                      </div>

                      <div className="summary-box">
                        <div className="summary-list">
                          {verifiedStores.length === 0 && (
                            <div className="summary-row">
                              <span>Cửa hàng</span>
                              <strong>Chưa có dữ liệu</strong>
                            </div>
                          )}

                          {verifiedStores.map((item) => (
                            <div key={`verified-${item.id}`} className="summary-row">
                              <span>{item.store_name}</span>
                              <strong>
                                ★ {item.google_rating || 0} · {item.address || "Chưa có địa chỉ"}
                              </strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activePage === "request" && (
            <section className="page active">
              <div className="page-grid">
                <div>
                  <span className="eyebrow">YÊU CẦU SỬA CHỮA</span>
                  <h2 className="page-title">Form tạo yêu cầu sửa chữa</h2>
                  <p className="muted">
                    Form này đã nối API tạo request. Sau khi gửi thành công, tab Theo dõi sẽ tải
                    lại dữ liệu trực tiếp từ database.
                  </p>
                </div>

                <div className="request-layout">
                  <div className="surface">
                    <div className="note-banner">
                      Sau khi điền form và bấm gửi, bạn sẽ được chọn Cửa hàng để giao máy.
                    </div>

                    <div className="space-18" />

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                      }}
                    >
                      <div className="form-grid">
                        <div className="form-group">
                          <label htmlFor="deviceType">Loại thiết bị</label>
                          <select
                            id="deviceType"
                            value={deviceType}
                            onChange={(e) => setDeviceType(e.target.value)}
                          >
                            <option>Điện thoại</option>
                            <option>Laptop</option>
                            <option>Máy tính bảng</option>
                            <option>Thiết bị thông minh</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label htmlFor="brand">Thương hiệu</label>
                          <select
                            id="brand"
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                          >
                            <option>Apple</option>
                            <option>Samsung</option>
                            <option>Dell</option>
                            <option>Xiaomi</option>
                            <option>Ecovacs</option>
                          </select>
                        </div>

                        <div className="form-group full">
                          <label htmlFor="model">Model / dòng máy</label>
                          <input
                            id="model"
                            type="text"
                            value={model}
                            placeholder="Ví dụ: iPhone 12, Dell Inspiron 14..."
                            onChange={(e) => setModel(e.target.value)}
                          />
                        </div>

                        <div className="form-group full">
                          <label htmlFor="issueTitle">Tiêu đề vấn đề</label>
                          <input
                            id="issueTitle"
                            type="text"
                            value={issueTitle}
                            placeholder="Ví dụ: Màn hình sọc xanh và cảm ứng chậm"
                            onChange={(e) => setIssueTitle(e.target.value)}
                          />
                        </div>

                        <div className="form-group full">
                          <label>Nhóm lỗi liên quan</label>
                          <div className="pill-row">
                            {["Màn hình", "Cảm ứng", "Pin", "Camera", "Nguồn", "Tản nhiệt"].map(
                              (item) => (
                                <label className="pill" key={item}>
                                  <input
                                    type="checkbox"
                                    checked={symptoms.includes(item)}
                                    onChange={() => toggleSymptom(item)}
                                  />
                                  <span>{item}</span>
                                </label>
                              )
                            )}
                          </div>
                        </div>

                        <div className="form-group full">
                          <label htmlFor="description">Mô tả chi tiết</label>
                          <textarea
                            id="description"
                            value={description}
                            placeholder="Mô tả lỗi xuất hiện khi nào, tần suất, có rơi vỡ hay vào nước không..."
                            onChange={(e) => setDescription(e.target.value)}
                          />
                        </div>

                        <div className="form-group full">
                          <label>Hình thức tiếp nhận</label>
                          <div className="pill-row">
                            {["Mang đến cửa hàng", "Nhận tận nơi", "Kiểm tra tại chỗ"].map(
                              (item) => (
                                <label className="pill" key={item}>
                                  <input
                                    type="radio"
                                    name="serviceMode"
                                    value={item}
                                    checked={serviceMode === item}
                                    onChange={(e) => setServiceMode(e.target.value)}
                                  />
                                  <span>{item}</span>
                                </label>
                              )
                            )}
                          </div>
                        </div>

                        <div className="form-group">
                          <label htmlFor="budget">Ngân sách dự kiến</label>
                          <input
                            id="budget"
                            type="number"
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="desiredDate">Ngày mong muốn</label>
                          <input
                            id="desiredDate"
                            type="date"
                            value={desiredDate}
                            onChange={(e) => setDesiredDate(e.target.value)}
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="phone">Số điện thoại liên hệ</label>
                          <input
                            id="phone"
                            type="text"
                            value={phone}
                            placeholder="09xxxxxxxx"
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="address">Địa chỉ nhận máy</label>
                          <input
                            id="address"
                            type="text"
                            value={address}
                            placeholder="Dùng khi pickup hoặc kiểm tra tận nơi"
                            onChange={(e) => setAddress(e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={getCurrentLocation}
                            disabled={loadingLocation}
                          >
                            {loadingLocation ? "Đang lấy vị trí..." : "📍 Lấy vị trí hiện tại"}
                          </button>
                        </div>
                      </div>

                      <div className="hero-actions mt-22">
                        <button
                          className="btn btn-primary"
                          type="button"
                          onClick={handleOpenStoreSelection}
                        >
                          Gửi yêu cầu
                        </button>
                        <button className="btn btn-secondary" type="button" onClick={resetForm}>
                          Làm mới form
                        </button>
                      </div>
                    </form>
                  </div>

                  <aside className="aside-card">
                    <div className="section-head">
                      <div>
                        <span className="eyebrow">TÓM TẮT</span>
                        <h3 className="section-title">Bản xem trước yêu cầu</h3>
                      </div>
                    </div>

                    <div className="summary-box">
                      <div className="summary-list">
                        <div className="summary-row">
                          <span>Thiết bị</span>
                          <strong>
                            {deviceType} · {brand}
                          </strong>
                        </div>
                        <div className="summary-row">
                          <span>Model</span>
                          <strong>{previewModel}</strong>
                        </div>
                        <div className="summary-row">
                          <span>Nhóm lỗi</span>
                          <strong>{previewSymptoms}</strong>
                        </div>
                        <div className="summary-row">
                          <span>Hình thức</span>
                          <strong>{serviceMode}</strong>
                        </div>
                        <div className="summary-row">
                          <span>Khoảng giá tham khảo</span>
                          <strong>{previewBudget}</strong>
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>

              {isModalOpen && (
                <div className="modal-overlay" style={{
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                  padding: '20px'
                }}>
                  <div className="modal-content" style={{
                    backgroundColor: 'white', padding: '30px', borderRadius: '24px',
                    width: '100%', maxWidth: '600px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                  }}>
                    <h2 style={{ marginBottom: '10px', color: '#111' }}>Chọn Cửa Hàng</h2>
                    <p className="muted" style={{ marginBottom: '20px', color: '#666' }}>Dưới đây là các cửa hàng đã xác minh. Hãy chọn nơi bạn muốn gửi máy.</p>
                    
                    <div className="store-list" style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {verifiedStores.map(store => (
                        <div key={store.id} className="store-item" style={{
                          padding: '16px', borderRadius: '16px', border: '1px solid #eee',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                          <div>
                            <strong style={{ display: 'block', fontSize: '16px', color: '#111' }}>{store.store_name}</strong>
                            <span className="muted" style={{ fontSize: '13px', color: '#666' }}>{store.address || "Chưa có địa chỉ"} · ★ {store.google_rating || 0}</span>
                          </div>
                          <button className="btn btn-primary" type="button" onClick={() => submitRepairRequestWithStore(store.id)}>Chọn</button>
                        </div>
                      ))}
                    </div>
                    
                    <button className="btn btn-secondary" type="button" style={{ marginTop: '20px', width: '100%' }} onClick={() => setIsModalOpen(false)}>Hủy bỏ</button>
                  </div>
                </div>
              )}
            </section>
          )}

          {activePage === "stores" && (
            <section className="page active">
              <div className="page-grid">
                <div>
                  <span className="eyebrow">CỬA HÀNG</span>
                  <h2 className="page-title">
                    {selectedStoreDetail ? `Cửa hàng: ${selectedStoreDetail.store_name}` : "Danh sách cửa hàng từ backend"}
                  </h2>
                  <p className="muted">
                    {selectedStoreDetail ? "Danh sách các dịch vụ và sản phẩm đang cung cấp." : "Phần này đang bind theo danh sách cửa hàng approved từ API dashboard."}
                  </p>
                </div>

                <div className="stores-layout">
                  <div className="surface">
                    
                    {!selectedStoreDetail ? (
                      <>
                        <div className="section-head">
                          <div>
                            <span className="eyebrow">CỬA HÀNG ĐỀ XUẤT</span>
                            <h3 className="section-title">Ưu tiên rating và độ tin cậy</h3>
                          </div>
                        </div>

                        <div className="store-grid">
                          {verifiedStores.length === 0 && (
                            <div className="note-banner">Chưa có cửa hàng nào từ backend.</div>
                          )}

                          {verifiedStores.map((store) => (
                            <div key={store.id} className="store-card">
                              <div className="store-card-head">
                                <div>
                                  <h3>{store.store_name}</h3>
                                  <p className="muted">{store.address || "Chưa có địa chỉ"}</p>
                                </div>
                                <div className="rating-badge">★ {store.google_rating || 0}</div>
                              </div>

                              <p className="muted">
                                {store.description || "Chưa có mô tả cửa hàng."}
                              </p>

                              <div className="chips">
                                <span className="chip">{store.total_quotes || 0} báo giá</span>
                                <span className="chip">{store.total_reviews || 0} đánh giá</span>
                                <span className="chip">Approved</span>
                              </div>

                              <div className="card-actions">
                                <button className="btn btn-primary" onClick={() => handleViewStoreDetail(store)}>
                                  Xem mặt hàng
                                </button>
                                <button className="btn btn-secondary" onClick={() => {
                                  openPage("request");
                                  setTimeout(() => handleOpenStoreSelection(), 100);
                                }}>
                                  Gửi yêu cầu
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      
                      <>
                        <div className="section-head" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "16px" }}>
                          <div>
                            <button 
                              className="mini-link" 
                              onClick={() => setSelectedStoreDetail(null)}
                              style={{ fontSize: "15px", fontWeight: "bold" }}
                            >
                              ← Quay lại danh sách
                            </button>
                            <h3 className="section-title" style={{ marginTop: "12px" }}>Các dịch vụ & Sản phẩm nổi bật</h3>
                          </div>
                        </div>

                        {loadingProducts ? (
                          <div className="note-banner" style={{ marginTop: "20px" }}>Đang tải danh sách mặt hàng...</div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
                            {storeProducts.length === 0 && (
                              <div className="note-banner" style={{ gridColumn: "1 / -1" }}>Cửa hàng này chưa đăng tải mặt hàng nào.</div>
                            )}
                            
                            {storeProducts.map(prod => (
                              <div key={prod.id} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <img 
                                  src={prod.image || "https://placehold.co/150x150?text=No+Image"} 
                                  alt={prod.name}
                                  style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px', border: '1px solid #f1f5f9' }} 
                                />
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#0f172a' }}>{prod.name}</h4>
                                <span style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", backgroundColor: prod.type === "Dịch vụ" ? "#dbeafe" : "#fef3c7", color: prod.type === "Dịch vụ" ? "#2563eb" : "#d97706" }}>
                                  {prod.type}
                                </span>
                                <div style={{ marginTop: '12px', fontWeight: 'bold', color: '#ef4444', fontSize: '16px' }}>
                                  {formatVND(prod.price)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div style={{ marginTop: "32px", textAlign: "center" }}>
                          <button className="btn btn-primary" style={{ padding: "12px 32px" }} onClick={() => {
                             openPage("request");
                             setTimeout(() => submitRepairRequestWithStore(selectedStoreDetail.id), 500); 
                          }}>
                            Bấm để gửi yêu cầu sửa chữa cho {selectedStoreDetail.store_name}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <aside className="aside-card">
                    <div className="section-head">
                      <div>
                        <span className="eyebrow">THỐNG KÊ</span>
                        <h3 className="section-title">Tổng quan hệ thống</h3>
                      </div>
                    </div>

                    <div className="summary-box">
                      <div className="summary-list">
                        <div className="summary-row">
                          <span>Cửa hàng approved</span>
                          <strong>{counters.verifiedStores || 0}</strong>
                        </div>
                        <div className="summary-row">
                          <span>Báo giá chờ phản hồi</span>
                          <strong>{counters.pendingQuotes || 0}</strong>
                        </div>
                        <div className="summary-row">
                          <span>Yêu cầu đang xử lý</span>
                          <strong>{counters.activeRequests || 0}</strong>
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            </section>
          )}

          {activePage === "tracking" && (
            <section className="page active">
              <div className="page-grid">
                <div>
                  <span className="eyebrow">THEO DÕI TIẾN ĐỘ</span>
                  <h2 className="page-title">Tracking đồng bộ từ SQL</h2>
                </div>

                <div className="metrics-grid">
                  <div className="stat-card">
                    <span>Tổng yêu cầu</span>
                    <strong>{trackingRequests.length}</strong>
                    <div className="muted">Lấy trực tiếp từ repair_requests</div>
                  </div>
                  <div className="stat-card">
                    <span>Đang xử lý</span>
                    <strong>
                      {
                        trackingRequests.filter((x) =>
                          ["OPEN", "QUOTED", "IN_PROGRESS"].includes(x.status)
                        ).length
                      }
                    </strong>
                    <div className="muted">OPEN / QUOTED / IN_PROGRESS</div>
                  </div>
                  <div className="stat-card">
                    <span>Đã hoàn tất</span>
                    <strong>{trackingRequests.filter((x) => x.status === "COMPLETED").length}</strong>
                    <div className="muted">Request COMPLETED</div>
                  </div>
                  <div className="stat-card">
                    <span>Đã hủy</span>
                    <strong>{trackingRequests.filter((x) => x.status === "CANCELLED").length}</strong>
                    <div className="muted">Request CANCELLED</div>
                  </div>
                </div>

                <div className="surface">
                  <div className="section-head">
                    <div>
                      <span className="eyebrow">REQUEST CỦA BẠN</span>
                      <h3 className="section-title">Danh sách đang theo dõi</h3>
                    </div>

                    <button className="mini-link" onClick={() => loadTrackingRequests()}>
                      Tải lại →
                    </button>
                  </div>

                  {trackingLoading && (
                    <div className="note-banner">Đang tải danh sách yêu cầu...</div>
                  )}

                  {trackingError && (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: 14,
                        borderRadius: 16,
                        border: "1px solid #fecaca",
                        background: "#fef2f2",
                        color: "#b91c1c",
                      }}
                    >
                      {trackingError}
                    </div>
                  )}

                  {!trackingLoading && trackingRequests.length === 0 && !trackingError && (
                    <div className="note-banner">Chưa có request nào từ database.</div>
                  )}

                  {trackingRequests.map((item) => (
                    <div key={`track-${item.id}`} className="request-card">
                      <div className="request-card-head">
                        <div>
                          <div className="request-title-row">
                            <span className={`status-chip ${statusClass(item.status)}`}>
                              {statusLabel(item.status)}
                            </span>
                            <span className="muted">RQ-{item.id}</span>
                          </div>
                          <h3>{item.device_name || item.title}</h3>
                          <p className="muted">{item.description || "Không có mô tả"}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <strong>{item.budget ? formatVND(item.budget) : "Chưa có giá"}</strong>
                          <div className="muted" style={{ marginBottom: "8px" }}>{formatDateTime(item.created_at)}</div>
                          
                          {/* 🚀 ĐÃ THÊM: NÚT XEM CHI TIẾT */}
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: "6px 12px", fontSize: "13px" }}
                            onClick={() => setSelectedTrackedRequest(item)}
                          >
                            Xem chi tiết
                          </button>
                        </div>
                      </div>

                      <div className="detail-grid">
                        <div className="detail-card">
                          <span>Trạng thái</span>
                          <strong>{statusLabel(item.status)}</strong>
                        </div>
                        <div className="detail-card">
                          <span>Danh mục</span>
                          <strong>{item.device_category || item.device_type || "Chưa rõ"}</strong>
                        </div>
                        <div className="detail-card">
                          <span>Địa điểm</span>
                          <strong>{item.location || "Chưa có"}</strong>
                        </div>
                        <div className="detail-card">
                          <span>Ngày tạo</span>
                          <strong>{formatDateTime(item.created_at)}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 🚀 ĐÃ THÊM: MODAL CHI TIẾT ĐƠN HÀNG Ở TAB THEO DÕI */}
              {selectedTrackedRequest && (
                <div className="modal-overlay" style={{
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                  padding: '20px', backdropFilter: "blur(4px)"
                }}>
                  <div className="modal-content" style={{
                    backgroundColor: 'white', padding: '32px', borderRadius: '24px',
                    width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                    maxHeight: '90vh', overflowY: 'auto'
                  }}>
                    <h2 style={{ marginTop: 0, color: '#0f172a' }}>Chi tiết đơn hàng #RQ-{selectedTrackedRequest.id}</h2>
                    
                    <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", marginBottom: "20px", border: "1px solid #e2e8f0" }}>
                      <h4 style={{ margin: "0 0 12px 0", color: "#334155" }}>Thông tin khách báo:</h4>
                      <p style={{ margin: "0 0 8px 0" }}><strong>Thiết bị:</strong> {selectedTrackedRequest.device_name}</p>
                      <p style={{ margin: "0 0 8px 0", color: "#ef4444" }}><strong>Lỗi gặp phải:</strong> {selectedTrackedRequest.title}</p>
                      <p style={{ margin: 0 }}><strong>Mô tả chi tiết:</strong> {selectedTrackedRequest.description}</p>
                    </div>

                    <div style={{ backgroundColor: selectedTrackedRequest.technician_note ? "#fffbeb" : "#f1f5f9", padding: "20px", borderRadius: "12px", border: selectedTrackedRequest.technician_note ? "1px solid #fde68a" : "1px dashed #cbd5e1" }}>
                      <h4 style={{ margin: "0 0 12px 0", color: selectedTrackedRequest.technician_note ? "#d97706" : "#64748b", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "18px" }}>👨‍🔧</span> Báo cáo của Kỹ thuật viên
                      </h4>
                      
                      {selectedTrackedRequest.technician_note ? (
                        <>
                          <div style={{ color: '#0f172a', fontSize: '15px', lineHeight: '1.6' }}>
                            {selectedTrackedRequest.technician_note}
                          </div>
                          {selectedTrackedRequest.extra_cost > 0 && (
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #fcd34d', color: '#ef4444', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Phí sửa chữa phát sinh:</span>
                              <span style={{ fontSize: '16px' }}>+ {formatVND(selectedTrackedRequest.extra_cost)}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <p style={{ margin: 0, color: "#94a3b8", fontStyle: "italic" }}>
                          Thợ kỹ thuật chưa cập nhật báo cáo cho đơn hàng này.
                        </p>
                      )}
                    </div>

                    <button 
                      className="btn btn-primary" 
                      style={{ marginTop: '24px', width: '100%', padding: '14px' }} 
                      onClick={() => setSelectedTrackedRequest(null)}
                    >
                      Đóng chi tiết
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {activePage === "chatbot" && (
            <section className="page active">
              <div className="page-grid">
                <div>
                  <span className="eyebrow">CHATBOT AI</span>
                  <h2 className="page-title">Màn hình hội thoại</h2>
                  <p className="muted">Phần này vẫn là giao diện mẫu, chưa nối backend AI.</p>
                </div>

                <div className="chat-layout">
                  <aside className="aside-card">
                    <div className="section-head">
                      <div>
                        <span className="eyebrow">PROMPT NHANH</span>
                        <h3 className="section-title">Câu hỏi gợi ý</h3>
                      </div>
                    </div>

                    <div className="prompt-list prompt-grid">
                      {quickPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          className="prompt-btn"
                          onClick={() => sendChatMessage(prompt)}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </aside>

                  <div className="surface chat-card">
                    <div className="note-banner">
                      Chẩn đoán AI chỉ mang tính tham khảo. Kết quả cuối cùng vẫn cần kỹ thuật
                      viên xác nhận.
                    </div>

                    <div className="chat-stream">
                      {chatMessages.map((msg, index) => (
                        <div key={`${msg.role}-${index}`} className={`bubble ${msg.role}`}>
                          <div className="bubble-head">
                            <strong>{msg.title}</strong>
                            <span className={msg.role === "ai" ? "muted" : ""}>{msg.time}</span>
                          </div>
                          <p>{msg.text}</p>
                        </div>
                      ))}
                    </div>

                    <div className="chat-composer">
                      <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Nhập triệu chứng thiết bị để nhận gợi ý sơ bộ..."
                      />
                      <div className="card-actions">
                        <button className="btn btn-primary" onClick={() => sendChatMessage(chatInput)}>
                          Gửi cho AI
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() =>
                            setChatInput("Laptop nóng lên rất nhanh sau 10 phút sử dụng")
                          }
                        >
                          Chèn ví dụ
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activePage === "profile" && (
            <section className="page active">
              <div className="page-grid">
                <div>
                  <span className="eyebrow">HỒ SƠ</span>
                  <h2 className="page-title">Thông tin người dùng đang lấy từ backend</h2>
                </div>

                <div className="profile-layout">
                  <aside className="profile-card">
                    <div className="profile-avatar">{user.initials || "U"}</div>

                    {!isEditingProfile ? (
                      <>
                        <h3>{user.name || "Chưa có tên"}</h3>
                        <p className="muted">{user.email || "Chưa có email"}</p>
                        <p className="muted">{user.roleLabel || "Chưa có vai trò"}</p>

                        <div className="profile-meta">
                          <div className="profile-meta-item">
                            <strong>Số điện thoại</strong>
                            <span className="muted">{user.phone || "Chưa cập nhật"}</span>
                          </div>
                          <div className="profile-meta-item">
                            <strong>Thiết bị đã lưu</strong>
                            <span className="muted">
                              {savedDevices.length > 0
                                ? savedDevices.map((item) => item.name).join(" · ")
                                : "Chưa có dữ liệu"}
                            </span>
                          </div>
                          <div className="profile-meta-item">
                            <strong>Thông báo chưa đọc</strong>
                            <span className="muted">{counters.unreadNotifications || 0}</span>
                          </div>
                        </div>

                        <div style={{ marginTop: 20 }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                              setProfileForm({
                                name: user.name || "",
                                phone: user.phone || "",
                              });
                              setProfileMessage("");
                              setIsEditingProfile(true);
                            }}
                          >
                            Chỉnh sửa hồ sơ
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h3>Chỉnh sửa hồ sơ</h3>
                        <p className="muted">{user.email || "Chưa có email"}</p>
                        <p className="muted">{user.roleLabel || "Chưa có vai trò"}</p>

                        <div className="profile-meta">
                          <div className="profile-meta-item">
                            <strong>Họ và tên</strong>
                            <input
                              type="text"
                              name="name"
                              value={profileForm.name}
                              onChange={handleProfileInputChange}
                              placeholder="Nhập họ và tên"
                              style={{
                                marginTop: 8,
                                width: "100%",
                                padding: "12px 14px",
                                borderRadius: 12,
                                border: "1px solid #dbe2ea",
                                outline: "none",
                              }}
                            />
                          </div>

                          <div className="profile-meta-item">
                            <strong>Số điện thoại</strong>
                            <input
                              type="text"
                              name="phone"
                              value={profileForm.phone}
                              onChange={handleProfileInputChange}
                              placeholder="Nhập số điện thoại"
                              style={{
                                marginTop: 8,
                                width: "100%",
                                padding: "12px 14px",
                                borderRadius: 12,
                                border: "1px solid #dbe2ea",
                                outline: "none",
                              }}
                            />
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 20,
                            display: "flex",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSaveProfile}
                            disabled={profileSaving}
                          >
                            {profileSaving ? "Đang lưu..." : "Lưu thay đổi"}
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              setIsEditingProfile(false);
                              setProfileMessage("");
                              setProfileForm({
                                name: user.name || "",
                                phone: user.phone || "",
                              });
                            }}
                          >
                            Hủy
                          </button>
                        </div>
                      </>
                    )}

                    {profileMessage && (
                      <div
                        style={{
                          marginTop: 14,
                          padding: 12,
                          borderRadius: 12,
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          color: "#1d4ed8",
                          fontWeight: 500,
                        }}
                      >
                        {profileMessage}
                      </div>
                    )}
                  </aside>

                  <div className="settings-grid">
                    <div className="setting-card">
                      <div className="section-head">
                        <div>
                          <span className="eyebrow">THỐNG KÊ</span>
                          <h3 className="section-title">Tài khoản của bạn</h3>
                        </div>
                      </div>

                      <div className="summary-box">
                        <div className="summary-list">
                          <div className="summary-row">
                            <span>Tổng yêu cầu</span>
                            <strong>{counters.totalRequests || 0}</strong>
                          </div>
                          <div className="summary-row">
                            <span>Đang xử lý</span>
                            <strong>{counters.activeRequests || 0}</strong>
                          </div>
                          <div className="summary-row">
                            <span>Đã hoàn tất</span>
                            <strong>{counters.completedRequests || 0}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="setting-card">
                      <div className="section-head">
                        <div>
                          <span className="eyebrow">DỮ LIỆU BACKEND</span>
                          <h3 className="section-title">Thiết bị và cửa hàng</h3>
                        </div>
                      </div>

                      <div className="summary-box">
                        <div className="summary-list">
                          <div className="summary-row">
                            <span>Thiết bị đã lưu</span>
                            <strong>{counters.savedDevices || 0}</strong>
                          </div>
                          <div className="summary-row">
                            <span>Cửa hàng approved</span>
                            <strong>{counters.verifiedStores || 0}</strong>
                          </div>
                          <div className="summary-row">
                            <span>Quote chờ phản hồi</span>
                            <strong>{counters.pendingQuotes || 0}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="space-12" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}