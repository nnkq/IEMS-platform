import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Home.css";
import { getHomeDashboard, searchHome } from "../api/homeApi";
import {
  createRepairRequest,
  getMyRepairRequests,
  getReviewForRequest,
  submitReviewForRequest,
} from "../api/repairApi";
import StoreChatPanel from "../components/StoreChatPanel";
import { createOrGetConversationByRequest } from "../api/chatApi";

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
  const [selectedTrackedRequest, setSelectedTrackedRequest] = useState(null);

  const [reviewModal, setReviewModal] = useState({
    open: false,
    item: null,
  });
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
  });
  const [reviewLoading, setReviewLoading] = useState(false);

  const [selectedStoreDetail, setSelectedStoreDetail] = useState(null);
  const [storeProducts, setStoreProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

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

  const [imageFile, setImageFile] = useState("");
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const searchTimeout = useRef(null);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);

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

  const counters = dashboardData?.counters || {};
  const recentRequests = dashboardData?.recentRequests || [];
  const pendingQuotes = dashboardData?.pendingQuotes || [];
  const savedDevices = dashboardData?.savedDevices || [];
  const verifiedStores = dashboardData?.verifiedStores || [];
  const user = dashboardData?.user || {};
  const header = dashboardData?.header || {};

  const previewBudget = useMemo(() => {
    const min = Math.max(Number(budget || 0) * 0.8, 200000);
    const max = Math.max(Number(budget || 0) * 1.25, min + 150000);
    return `${formatVND(min)} - ${formatVND(max)}`;
  }, [budget]);

  const previewModel = model.trim() || "Chưa nhập model";
  const previewSymptoms = symptoms.length ? symptoms.join(", ") : "Chưa chọn";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    sessionStorage.clear();
    window.location.href = "/login";
  };

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
    setImageFile("");
    setUserLocation({ lat: null, lng: null });
    setAddressSuggestions([]);
    setShowAddressDropdown(false);
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

  const searchAddress = (text) => {
    setAddress(text);

    if (text.length < 3) {
      setAddressSuggestions([]);
      setShowAddressDropdown(false);
      return;
    }

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const searchQuery = `${text}, Đà Nẵng, Việt Nam`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery
          )}&limit=5&addressdetails=1`
        );
        const data = await res.json();

        setAddressSuggestions(data);
        setShowAddressDropdown(true);
      } catch (error) {
        console.error("Lỗi tìm địa chỉ:", error);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 500);
  };

  const handleSelectAddress = (item) => {
    setAddress(item.display_name);
    setUserLocation({ lat: parseFloat(item.lat), lng: parseFloat(item.lon) });
    setShowAddressDropdown(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFile(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => setImageFile("");

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

  const openReviewModal = async (item) => {
    try {
      setReviewLoading(true);

      const res = await getReviewForRequest(item.id);
      const serverReview = res.data?.review;

      if (res.data?.hasReview && serverReview) {
        alert(`Đơn này đã được đánh giá ${serverReview.rating}/5 sao rồi.`);
        return;
      }

      if (!res.data?.canReview) {
        alert("Chỉ đánh giá được khi đơn đã hoàn thành.");
        return;
      }

      setReviewForm({
        rating: 5,
        comment: "",
      });

      setReviewModal({
        open: true,
        item: {
          ...item,
          store_name: res.data?.store?.name || item.store_name || "Cửa hàng",
        },
      });
    } catch (error) {
      console.error("Lỗi mở form đánh giá:", error);
      alert(error.response?.data?.message || "Không mở được form đánh giá");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewModal.item?.id) return;

    try {
      setReviewLoading(true);

      await submitReviewForRequest(reviewModal.item.id, {
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment,
      });

      alert("Đánh giá cửa hàng thành công!");

      setReviewModal({
        open: false,
        item: null,
      });

      setReviewForm({
        rating: 5,
        comment: "",
      });

      await loadTrackingRequests();
    } catch (error) {
      console.error("Lỗi gửi đánh giá:", error);
      alert(error.response?.data?.message || "Gửi đánh giá thất bại");
    } finally {
      setReviewLoading(false);
    }
  };

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

  const handleOpenSummary = () => {
    if (!issueTitle.trim() || !description.trim()) {
      alert("Vui lòng nhập tiêu đề và mô tả lỗi");
      return;
    }
    if (!userLocation.lat || !userLocation.lng) {
      alert("Vui lòng chọn một địa chỉ từ danh sách gợi ý.");
      return;
    }
    setShowSummaryModal(true);
  };

  const proceedToStoreSelection = () => {
    setShowSummaryModal(false);
    setIsModalOpen(true);
  };

  const handleOpenStoreSelection = () => {
    if (!issueTitle.trim() || !description.trim()) {
      alert("Vui lòng nhập tiêu đề và mô tả lỗi trước");
      openPage("request");
      return;
    }

    if (!userLocation.lat || !userLocation.lng) {
      alert("Vui lòng chọn địa chỉ hợp lệ trước");
      openPage("request");
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
        image: imageFile || null,
      };

      const res = await createRepairRequest(payload);
      const localUser = JSON.parse(localStorage.getItem("user") || "{}");

      if (res.data?.request_id && localUser?.id && selectedStoreId) {
        await createOrGetConversationByRequest({
          repair_request_id: res.data.request_id,
          user_id: localUser.id,
          store_id: selectedStoreId,
        });
      }

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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    border: "1px solid #dbe4ee",
                    background: "#fff",
                    padding: "8px 12px 8px 8px",
                    borderRadius: 999,
                    cursor: "pointer",
                  }}
                >
                  <div className="avatar">{user.initials || buildInitials(user.name || "U")}</div>
                  <div className="user-info" style={{ textAlign: "left" }}>
                    <p className="user-name" style={{ margin: 0, fontWeight: 700 }}>
                      {user.name || "Chưa có dữ liệu"}
                    </p>
                    <p className="user-role" style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
                      {user.roleLabel || "Người dùng"}
                    </p>
                  </div>
                </button>

                {menuOpen && (
                  <div
                    className="dropdown-menu"
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 8px)",
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 16,
                      padding: 8,
                      boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
                      zIndex: 20,
                    }}
                  >
                    <button
                      type="button"
                      className="logout-btn"
                      onClick={handleLogout}
                      style={{
                        border: 0,
                        background: "#fff",
                        cursor: "pointer",
                        padding: "10px 14px",
                        borderRadius: 12,
                        width: "100%",
                      }}
                    >
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
                      thì giao diện sẽ hiện rỗng hoặc hiện lỗi thật.
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
                <div style={{ marginBottom: "16px" }}>
                  <h2 className="page-title" style={{ margin: "0 0 8px 0" }}>
                    Tạo yêu cầu mới
                  </h2>
                  <p className="muted" style={{ margin: 0 }}>
                    Điền thông tin tình trạng máy của bạn. Hệ thống sẽ giúp bạn tìm cửa hàng phù hợp nhất.
                  </p>
                </div>

                <div className="surface" style={{ width: "100%", padding: "20px" }}>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                    }}
                  >
                    <div
                      className="form-grid"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "16px",
                        alignItems: "start",
                      }}
                    >
                      <div className="form-group" style={{ margin: 0 }}>
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

                      <div className="form-group" style={{ margin: 0 }}>
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

                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="model">Model / dòng máy</label>
                        <input
                          id="model"
                          type="text"
                          value={model}
                          placeholder="Ví dụ: iPhone 12, Dell Inspiron 14..."
                          onChange={(e) => setModel(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0, gridColumn: "span 2" }}>
                        <label htmlFor="issueTitle">Tiêu đề vấn đề</label>
                        <input
                          id="issueTitle"
                          type="text"
                          value={issueTitle}
                          placeholder="Ví dụ: Màn hình sọc xanh và cảm ứng chậm"
                          onChange={(e) => setIssueTitle(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="phone">Số điện thoại liên hệ</label>
                        <input
                          id="phone"
                          type="text"
                          value={phone}
                          placeholder="09xxxxxxxx"
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0, gridColumn: "span 3" }}>
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

                      <div
                        className="form-group"
                        style={{ margin: 0, position: "relative", gridColumn: "span 2" }}
                      >
                        <label htmlFor="address">Địa chỉ của bạn</label>
                        <div
                          className="search-shell"
                          style={{
                            width: "100%",
                            margin: 0,
                            padding: "0 12px",
                            border: "1px solid #dbe2ea",
                            borderRadius: "12px",
                            background: "#fff",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <span style={{ color: "#94a3b8", paddingRight: "8px" }}>📍</span>
                          <input
                            id="address"
                            type="text"
                            value={address}
                            placeholder="Nhập địa chỉ (VD: 109 Nguyễn Thuật)..."
                            onChange={(e) => searchAddress(e.target.value)}
                            onFocus={() =>
                              addressSuggestions.length > 0 && setShowAddressDropdown(true)
                            }
                            autoComplete="off"
                            style={{
                              border: "none",
                              outline: "none",
                              padding: "10px 0",
                              width: "100%",
                              background: "transparent",
                            }}
                          />
                          {isSearchingAddress && (
                            <span
                              style={{
                                fontSize: "12px",
                                color: "#64748b",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Đang tìm...
                            </span>
                          )}
                        </div>

                        {showAddressDropdown && addressSuggestions.length > 0 && (
                          <div
                            className="address-dropdown"
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              right: 0,
                              zIndex: 10,
                              backgroundColor: "white",
                              border: "1px solid #e2e8f0",
                              borderRadius: "12px",
                              marginTop: "4px",
                              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                              maxHeight: "200px",
                              overflowY: "auto",
                            }}
                          >
                            {addressSuggestions.map((item, index) => {
                              const nameParts = item.display_name.split(",");
                              const mainText = nameParts[0];
                              const subText = nameParts.slice(1).join(",").trim();

                              return (
                                <div
                                  key={index}
                                  onClick={() => handleSelectAddress(item)}
                                  style={{
                                    padding: "10px 16px",
                                    borderBottom: "1px solid #f1f5f9",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: "12px",
                                  }}
                                  onMouseOver={(e) =>
                                    (e.currentTarget.style.backgroundColor = "#f8fafc")
                                  }
                                  onMouseOut={(e) =>
                                    (e.currentTarget.style.backgroundColor = "transparent")
                                  }
                                >
                                  <span style={{ color: "#94a3b8", marginTop: "2px" }}>⚲</span>
                                  <div>
                                    <strong
                                      style={{
                                        display: "block",
                                        color: "#0f172a",
                                        fontSize: "14px",
                                      }}
                                    >
                                      {mainText}
                                    </strong>
                                    <span style={{ color: "#64748b", fontSize: "13px" }}>
                                      {subText}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="budget">Ngân sách dự kiến (VND)</label>
                        <input
                          id="budget"
                          type="number"
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                        />
                        <span className="muted" style={{ fontSize: 13 }}>
                          Khoảng dự kiến: {previewBudget}
                        </span>
                      </div>

                      <div className="form-group" style={{ margin: 0, gridColumn: "span 2" }}>
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

                      <div className="form-group" style={{ margin: 0 }}>
                        <label htmlFor="desiredDate">Ngày mong muốn</label>
                        <input
                          id="desiredDate"
                          type="date"
                          value={desiredDate}
                          onChange={(e) => setDesiredDate(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0, gridColumn: "span 2" }}>
                        <label htmlFor="description">Mô tả chi tiết</label>
                        <textarea
                          id="description"
                          value={description}
                          placeholder="Mô tả lỗi xuất hiện khi nào, tần suất, có rơi vỡ hay vào nước không..."
                          onChange={(e) => setDescription(e.target.value)}
                          style={{ height: "100px", resize: "none" }}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Hình ảnh thiết bị (Không bắt buộc)</label>
                        {!imageFile ? (
                          <div
                            className="image-upload-box"
                            style={{
                              border: "2px dashed #cbd5e1",
                              padding: "16px",
                              textAlign: "center",
                              borderRadius: "12px",
                              cursor: "pointer",
                              backgroundColor: "#f8fafc",
                              transition: "all 0.2s",
                              height: "100px",
                              display: "flex",
                              alignItems: "center",
                              justifyItems: "center",
                            }}
                            onMouseOver={(e) =>
                              (e.currentTarget.style.borderColor = "#3b82f6")
                            }
                            onMouseOut={(e) =>
                              (e.currentTarget.style.borderColor = "#cbd5e1")
                            }
                          >
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              style={{ display: "none" }}
                              id="file-upload"
                            />
                            <label
                              htmlFor="file-upload"
                              style={{ cursor: "pointer", display: "block", width: "100%" }}
                            >
                              <div style={{ fontSize: "24px", marginBottom: "4px" }}>📸</div>
                              <span
                                style={{
                                  fontWeight: "500",
                                  color: "#0f172a",
                                  fontSize: "13px",
                                }}
                              >
                                Tải ảnh lên
                              </span>
                            </label>
                          </div>
                        ) : (
                          <div
                            style={{
                              position: "relative",
                              display: "inline-block",
                              padding: "4px",
                              border: "1px solid #e2e8f0",
                              borderRadius: "12px",
                              backgroundColor: "#f8fafc",
                              height: "100px",
                              width: "100%",
                            }}
                          >
                            <img
                              src={imageFile}
                              alt="Preview"
                              style={{
                                height: "100%",
                                width: "100%",
                                borderRadius: "8px",
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                            <button
                              type="button"
                              onClick={removeImage}
                              style={{
                                position: "absolute",
                                top: "-8px",
                                right: "-8px",
                                background: "#ef4444",
                                color: "white",
                                border: "none",
                                borderRadius: "50%",
                                width: "24px",
                                height: "24px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                fontSize: "12px",
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className="hero-actions"
                      style={{
                        borderTop: "1px solid #e2e8f0",
                        paddingTop: "16px",
                        marginTop: "16px",
                        display: "flex",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <button className="btn btn-secondary" type="button" onClick={getCurrentLocation}>
                          {loadingLocation ? "Đang lấy GPS..." : "Lấy vị trí hiện tại"}
                        </button>
                        <button className="btn btn-secondary" type="button" onClick={fetchNearbyStores}>
                          Gợi ý cửa hàng gần
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <button className="btn btn-secondary" type="button" onClick={resetForm}>
                          Làm mới form
                        </button>
                        <button className="btn btn-primary" type="button" onClick={handleOpenSummary}>
                          Tiếp tục
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

              {showSummaryModal && (
                <div
                  className="modal-overlay"
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(15, 23, 42, 0.7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                    padding: "20px",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <div
                    className="modal-content"
                    style={{
                      backgroundColor: "white",
                      padding: "30px",
                      borderRadius: "24px",
                      width: "100%",
                      maxWidth: "500px",
                      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                    }}
                  >
                    <div
                      style={{
                        borderBottom: "1px solid #e2e8f0",
                        paddingBottom: "16px",
                        marginBottom: "20px",
                      }}
                    >
                      <h2 style={{ margin: 0, color: "#0f172a" }}>Tóm tắt yêu cầu</h2>
                      <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>
                        Kiểm tra lại thông tin trước khi chọn cửa hàng
                      </p>
                    </div>

                    <div
                      className="summary-list"
                      style={{ display: "flex", flexDirection: "column", gap: "16px" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span style={{ color: "#64748b", minWidth: "100px" }}>Thiết bị:</span>
                        <strong style={{ textAlign: "right", color: "#0f172a" }}>
                          {deviceType} · {brand}
                          <br />
                          {previewModel}
                        </strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span style={{ color: "#64748b", minWidth: "100px" }}>Vấn đề:</span>
                        <strong style={{ textAlign: "right", color: "#0f172a" }}>{issueTitle}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span style={{ color: "#64748b", minWidth: "100px" }}>Nhóm lỗi:</span>
                        <strong style={{ textAlign: "right", color: "#0f172a" }}>{previewSymptoms}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span style={{ color: "#64748b", minWidth: "100px" }}>Hình thức:</span>
                        <strong style={{ textAlign: "right", color: "#0f172a" }}>{serviceMode}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span style={{ color: "#64748b", minWidth: "100px" }}>Địa chỉ:</span>
                        <strong
                          style={{
                            textAlign: "right",
                            maxWidth: "70%",
                            color: "#0f172a",
                            lineHeight: "1.4",
                          }}
                        >
                          {address}
                        </strong>
                      </div>
                      {imageFile && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <span style={{ color: "#64748b", minWidth: "100px" }}>Ảnh báo lỗi:</span>
                          <img
                            src={imageFile}
                            alt="Attached"
                            style={{
                              height: "60px",
                              borderRadius: "6px",
                              border: "1px solid #e2e8f0",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => setShowSummaryModal(false)}
                        style={{ flex: 1 }}
                      >
                        Sửa lại
                      </button>
                      <button
                        className="btn btn-primary"
                        type="button"
                        style={{ flex: 1.5 }}
                        onClick={proceedToStoreSelection}
                      >
                        Xác nhận & Chọn cửa hàng
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isModalOpen && (
                <div
                  className="modal-overlay"
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(15, 23, 42, 0.7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                    padding: "20px",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <div
                    className="modal-content"
                    style={{
                      backgroundColor: "white",
                      padding: "30px",
                      borderRadius: "24px",
                      width: "100%",
                      maxWidth: "600px",
                      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                    }}
                  >
                    <h2 style={{ marginBottom: "10px", color: "#0f172a" }}>Chọn Cửa Hàng</h2>
                    <p className="muted" style={{ marginBottom: "20px", color: "#64748b" }}>
                      Dưới đây là các cửa hàng đã xác minh. Hãy chọn nơi bạn muốn gửi máy để hoàn tất đơn.
                    </p>

                    <div
                      className="store-list"
                      style={{
                        maxHeight: "400px",
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      {verifiedStores.map((store) => (
                        <div
                          key={store.id}
                          className="store-item"
                          style={{
                            padding: "16px",
                            borderRadius: "16px",
                            border: "1px solid #e2e8f0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 16,
                            transition: "border-color 0.2s",
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.borderColor = "#cbd5e1")}
                          onMouseOut={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                        >
                          <div>
                            <strong
                              style={{
                                display: "block",
                                fontSize: "16px",
                                color: "#0f172a",
                              }}
                            >
                              {store.store_name}
                            </strong>
                            <span
                              className="muted"
                              style={{ fontSize: "13px", color: "#64748b" }}
                            >
                              {store.address || "Chưa có địa chỉ"} · ★ {store.google_rating || 0}
                            </span>
                          </div>
                          <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() => submitRepairRequestWithStore(store.id)}
                          >
                            Gửi đơn
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      className="btn btn-secondary"
                      type="button"
                      style={{ marginTop: "20px", width: "100%" }}
                      onClick={() => setIsModalOpen(false)}
                    >
                      Hủy bỏ
                    </button>
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
                    {selectedStoreDetail
                      ? `Cửa hàng: ${selectedStoreDetail.store_name}`
                      : "Danh sách cửa hàng từ backend"}
                  </h2>
                  <p className="muted">
                    {selectedStoreDetail
                      ? "Danh sách các dịch vụ và sản phẩm đang cung cấp."
                      : "Phần này đang bind theo danh sách cửa hàng approved từ API dashboard."}
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
                                <button
                                  className="btn btn-primary"
                                  onClick={() => handleViewStoreDetail(store)}
                                >
                                  Xem mặt hàng
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => {
                                    openPage("request");
                                    setTimeout(() => handleOpenStoreSelection(), 100);
                                  }}
                                >
                                  Gửi yêu cầu
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          className="section-head"
                          style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "16px" }}
                        >
                          <div>
                            <button
                              className="mini-link"
                              onClick={() => setSelectedStoreDetail(null)}
                              style={{ fontSize: "15px", fontWeight: "bold" }}
                            >
                              ← Quay lại danh sách
                            </button>
                            <h3 className="section-title" style={{ marginTop: "12px" }}>
                              Các dịch vụ & Sản phẩm nổi bật
                            </h3>
                          </div>
                        </div>

                        {loadingProducts ? (
                          <div className="note-banner" style={{ marginTop: "20px" }}>
                            Đang tải danh sách mặt hàng...
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                              gap: "16px",
                              marginTop: "24px",
                            }}
                          >
                            {storeProducts.length === 0 && (
                              <div className="note-banner" style={{ gridColumn: "1 / -1" }}>
                                Cửa hàng này chưa đăng tải mặt hàng nào.
                              </div>
                            )}

                            {storeProducts.map((prod) => (
                              <div
                                key={prod.id}
                                style={{
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "16px",
                                  padding: "16px",
                                  backgroundColor: "#fff",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                                }}
                              >
                                <img
                                  src={prod.image || "https://placehold.co/150x150?text=No+Image"}
                                  alt={prod.name}
                                  style={{
                                    width: "100%",
                                    height: "140px",
                                    objectFit: "cover",
                                    borderRadius: "8px",
                                    marginBottom: "12px",
                                    border: "1px solid #f1f5f9",
                                  }}
                                />
                                <h4
                                  style={{
                                    margin: "0 0 8px 0",
                                    fontSize: "15px",
                                    color: "#0f172a",
                                  }}
                                >
                                  {prod.name}
                                </h4>
                                <span
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: "20px",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                    backgroundColor:
                                      prod.type === "Dịch vụ" ? "#dbeafe" : "#fef3c7",
                                    color: prod.type === "Dịch vụ" ? "#2563eb" : "#d97706",
                                  }}
                                >
                                  {prod.type}
                                </span>
                                <div
                                  style={{
                                    marginTop: "12px",
                                    fontWeight: "bold",
                                    color: "#ef4444",
                                    fontSize: "16px",
                                  }}
                                >
                                  {formatVND(prod.price)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ marginTop: "32px", textAlign: "center" }}>
                          <button
                            className="btn btn-primary"
                            style={{ padding: "12px 32px" }}
                            onClick={() => {
                              openPage("request");
                              setTimeout(() => {
                                if (!issueTitle.trim() || !description.trim() || !userLocation.lat) {
                                  alert("Hãy nhập thông tin yêu cầu và địa chỉ trước rồi mới gửi đơn.");
                                  return;
                                }
                                submitRepairRequestWithStore(selectedStoreDetail.id);
                              }, 500);
                            }}
                          >
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
                          <div className="muted" style={{ marginBottom: "8px" }}>
                            {formatDateTime(item.created_at)}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              justifyContent: "flex-end",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              className="btn btn-secondary"
                              style={{ padding: "6px 12px", fontSize: "13px" }}
                              onClick={() => setSelectedTrackedRequest(item)}
                            >
                              Xem chi tiết
                            </button>

                            {item.status === "COMPLETED" && !item.has_review && (
                              <button
                                className="btn btn-primary"
                                style={{ padding: "6px 12px", fontSize: "13px" }}
                                onClick={() => openReviewModal(item)}
                                disabled={reviewLoading}
                              >
                                Đánh giá
                              </button>
                            )}

                            {item.status === "COMPLETED" && item.has_review && (
                              <span
                                className="status-chip status-success"
                                style={{ padding: "8px 12px" }}
                              >
                                Đã đánh giá {item.review?.rating || 0}/5 ★
                              </span>
                            )}
                          </div>
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

              {selectedTrackedRequest && (
                <div
                  className="modal-overlay"
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(15, 23, 42, 0.7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                    padding: "20px",
                    backdropFilter: "blur(4px)",
                  }}
                  onClick={() => setSelectedTrackedRequest(null)}
                >
                  <div
                    className="modal-content"
                    style={{
                      backgroundColor: "white",
                      padding: "32px",
                      borderRadius: "24px",
                      width: "100%",
                      maxWidth: "600px",
                      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                      maxHeight: "90vh",
                      overflowY: "auto",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h2 style={{ marginTop: 0, color: "#0f172a" }}>
                      Chi tiết đơn hàng #RQ-{selectedTrackedRequest.id}
                    </h2>

                    <div
                      style={{
                        backgroundColor: "#f8fafc",
                        padding: "16px",
                        borderRadius: "12px",
                        marginBottom: "20px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <h4 style={{ margin: "0 0 12px 0", color: "#334155" }}>
                        Thông tin khách báo:
                      </h4>
                      <p style={{ margin: "0 0 8px 0" }}>
                        <strong>Thiết bị:</strong> {selectedTrackedRequest.device_name}
                      </p>
                      <p style={{ margin: "0 0 8px 0", color: "#ef4444" }}>
                        <strong>Lỗi gặp phải:</strong> {selectedTrackedRequest.title}
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong>Mô tả chi tiết:</strong> {selectedTrackedRequest.description}
                      </p>
                    </div>

                    <div
                      style={{
                        backgroundColor: selectedTrackedRequest.technician_note ? "#fffbeb" : "#f1f5f9",
                        padding: "20px",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        marginBottom: "20px",
                      }}
                    >
                      <h4 style={{ margin: "0 0 12px 0", color: "#334155" }}>
                        Ghi chú kỹ thuật / cửa hàng
                      </h4>
                      <p style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>
                        {selectedTrackedRequest.technician_note ||
                          "Cửa hàng chưa cập nhật ghi chú kỹ thuật cho đơn này."}
                      </p>
                    </div>

                    <div className="summary-box">
                      <div className="summary-list">
                        <div className="summary-row">
                          <span>Trạng thái</span>
                          <strong>{statusLabel(selectedTrackedRequest.status)}</strong>
                        </div>
                        <div className="summary-row">
                          <span>Ngân sách / Chi phí</span>
                          <strong>
                            {selectedTrackedRequest.extra_cost
                              ? formatVND(selectedTrackedRequest.extra_cost)
                              : selectedTrackedRequest.budget
                              ? formatVND(selectedTrackedRequest.budget)
                              : "Chưa có"}
                          </strong>
                        </div>
                        <div className="summary-row">
                          <span>Địa điểm</span>
                          <strong>{selectedTrackedRequest.location || "Chưa có"}</strong>
                        </div>
                        <div className="summary-row">
                          <span>Ngày tạo</span>
                          <strong>{formatDateTime(selectedTrackedRequest.created_at)}</strong>
                        </div>
                        <div className="summary-row">
                          <span>Cửa hàng</span>
                          <strong>{selectedTrackedRequest.store_name || "Chưa xác định"}</strong>
                        </div>
                      </div>
                    </div>

                    {selectedTrackedRequest.image && (
                      <div style={{ marginTop: 20 }}>
                        <h4 style={{ marginBottom: 12 }}>Ảnh khách đã gửi</h4>
                        <img
                          src={selectedTrackedRequest.image}
                          alt="Repair request"
                          style={{
                            width: "100%",
                            maxHeight: 260,
                            objectFit: "cover",
                            borderRadius: 16,
                            border: "1px solid #e2e8f0",
                          }}
                        />
                      </div>
                    )}

                    <div style={{ marginTop: 24, textAlign: "right" }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setSelectedTrackedRequest(null)}
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {reviewModal.open && reviewModal.item && (
                <div
                  className="modal-overlay"
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(15, 23, 42, 0.7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                    padding: "20px",
                    backdropFilter: "blur(4px)",
                  }}
                  onClick={() => {
                    if (reviewLoading) return;
                    setReviewModal({ open: false, item: null });
                  }}
                >
                  <div
                    className="modal-content"
                    style={{
                      backgroundColor: "white",
                      padding: "30px",
                      borderRadius: "24px",
                      width: "100%",
                      maxWidth: "560px",
                      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      style={{
                        borderBottom: "1px solid #e2e8f0",
                        paddingBottom: "16px",
                        marginBottom: "20px",
                      }}
                    >
                      <h2 style={{ margin: 0, color: "#0f172a" }}>Đánh giá cửa hàng</h2>
                      <p style={{ margin: "6px 0 0 0", color: "#64748b", fontSize: "14px" }}>
                        Bạn đang đánh giá đơn RQ-{reviewModal.item.id} tại{" "}
                        {reviewModal.item.store_name || "cửa hàng"}.
                      </p>
                    </div>

                    <div style={{ display: "grid", gap: "18px" }}>
                      <div>
                        <label
                          style={{
                            fontWeight: 700,
                            display: "block",
                            marginBottom: "10px",
                          }}
                        >
                          Chọn số sao
                        </label>

                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              className={
                                Number(reviewForm.rating) === star
                                  ? "btn btn-primary"
                                  : "btn btn-secondary"
                              }
                              onClick={() =>
                                setReviewForm((prev) => ({
                                  ...prev,
                                  rating: star,
                                }))
                              }
                            >
                              {star} ★
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Nhận xét</label>
                        <textarea
                          value={reviewForm.comment}
                          onChange={(e) =>
                            setReviewForm((prev) => ({
                              ...prev,
                              comment: e.target.value,
                            }))
                          }
                          placeholder="Ví dụ: cửa hàng sửa nhanh, tư vấn rõ ràng, thái độ tốt..."
                        />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          justifyContent: "flex-end",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            if (reviewLoading) return;
                            setReviewModal({ open: false, item: null });
                          }}
                        >
                          Đóng
                        </button>

                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleSubmitReview}
                          disabled={reviewLoading}
                        >
                          {reviewLoading ? "Đang gửi..." : "Gửi đánh giá"}
                        </button>
                      </div>
                    </div>
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
                  <h2 className="page-title">Chẩn đoán sơ bộ thiết bị</h2>
                  <p className="muted">
                    Bạn có thể nhập triệu chứng để nhận gợi ý ban đầu trước khi tạo yêu cầu sửa chữa.
                  </p>
                </div>

                <div className="chat-layout">
                  <div className="surface">
                    <div className="section-head">
                      <div>
                        <span className="eyebrow">GỢI Ý NHANH</span>
                        <h3 className="section-title">Prompt mẫu</h3>
                      </div>
                    </div>

                    <div className="prompt-grid" style={{ gap: 12 }}>
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

                  </div>

                  <div className="surface chat-card">
                    <div className="section-head">
                      <div>
                        <span className="eyebrow">HỘI THOẠI</span>
                        <h3 className="section-title">IEMS AI Assistant</h3>
                      </div>
                    </div>

                    <div className="chat-stream">
                      {chatMessages.map((msg, index) => (
                        <div key={`${msg.role}-${index}`} className={`bubble ${msg.role}`}>
                          <div className="bubble-head">
                            <strong>{msg.title}</strong>
                            <span className="muted">{msg.time}</span>
                          </div>
                          <p>{msg.text}</p>
                        </div>
                      ))}
                    </div>

                    <div className="chat-composer">
                      <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Nhập triệu chứng thiết bị của bạn..."
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                        <button className="btn btn-secondary" onClick={() => setChatInput("")}>
                          Xóa
                        </button>
                        <button className="btn btn-primary" onClick={() => sendChatMessage(chatInput)}>
                          Gửi
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
                  <h2 className="page-title">Tài khoản và cài đặt cá nhân</h2>
                  <p className="muted">
                    Quản lý thông tin tài khoản, số điện thoại và các dữ liệu đã lưu.
                  </p>
                </div>

                <div className="profile-layout">
                  <div className="profile-card">
                    <div className="profile-avatar">
                      {user.initials || buildInitials(user.name || "U")}
                    </div>
                    <h3 style={{ marginBottom: 8 }}>{user.name || "Chưa có tên"}</h3>
                    <p className="muted">{user.email || "Chưa có email"}</p>

                    <div className="profile-meta">
                      <div className="profile-meta-item">
                        <strong>Số điện thoại</strong>
                        <span>{user.phone || "Chưa cập nhật"}</span>
                      </div>
                      <div className="profile-meta-item">
                        <strong>Thiết bị đã lưu</strong>
                        <span>{savedDevices.length}</span>
                      </div>
                      <div className="profile-meta-item">
                        <strong>Yêu cầu đã tạo</strong>
                        <span>{counters.totalRequests || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="settings-grid">
                    <div className="setting-card">
                      <div className="section-head">
                        <div>
                          <span className="eyebrow">THÔNG TIN CÁ NHÂN</span>
                          <h3 className="section-title">Cập nhật hồ sơ</h3>
                        </div>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setIsEditingProfile((prev) => !prev)}
                        >
                          {isEditingProfile ? "Hủy" : "Chỉnh sửa"}
                        </button>
                      </div>

                      <div className="form-grid">
                        <div className="form-group">
                          <label>Họ và tên</label>
                          <input
                            name="name"
                            value={profileForm.name}
                            onChange={handleProfileInputChange}
                            disabled={!isEditingProfile}
                          />
                        </div>

                        <div className="form-group">
                          <label>Số điện thoại</label>
                          <input
                            name="phone"
                            value={profileForm.phone}
                            onChange={handleProfileInputChange}
                            disabled={!isEditingProfile}
                          />
                        </div>
                      </div>

                      {profileMessage && (
                        <div
                          className={
                            profileMessage.toLowerCase().includes("thành công")
                              ? "note-banner success"
                              : "note-banner"
                          }
                          style={{ marginTop: 16 }}
                        >
                          {profileMessage}
                        </div>
                      )}

                      {isEditingProfile && (
                        <div style={{ marginTop: 16, textAlign: "right" }}>
                          <button
                            className="btn btn-primary"
                            onClick={handleSaveProfile}
                            disabled={profileSaving}
                          >
                            {profileSaving ? "Đang lưu..." : "Lưu thay đổi"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="setting-card">
                      <div className="section-head">
                        <div>
                          <span className="eyebrow">THIẾT BỊ ĐÃ LƯU</span>
                          <h3 className="section-title">Danh sách thiết bị</h3>
                        </div>
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
                            <div key={`profile-saved-${item.id}`} className="summary-row">
                              <span>{item.category || "Thiết bị"}</span>
                              <strong>{item.name}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="setting-card">
                      <div className="section-head">
                        <div>
                          <span className="eyebrow">THÔNG TIN KHÁC</span>
                          <h3 className="section-title">Tổng quan tài khoản</h3>
                        </div>
                      </div>

                      <div className="summary-box">
                        <div className="summary-list">
                          <div className="summary-row">
                            <span>Thông báo chưa đọc</span>
                            <strong>{counters.unreadNotifications || 0}</strong>
                          </div>
                          <div className="summary-row">
                            <span>Báo giá chờ phản hồi</span>
                            <strong>{counters.pendingQuotes || 0}</strong>
                          </div>
                          <div className="summary-row">
                            <span>Đơn đang xử lý</span>
                            <strong>{counters.activeRequests || 0}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>

        <StoreChatPanel />
      </div>
    </div>
  );
}