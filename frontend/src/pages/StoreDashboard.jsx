import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StoreOwnerChatPanel from "../components/StoreOwnerChatPanel";

export default function StoreDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Hồ sơ");
  const currentStoreUser = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất khỏi cửa hàng?")) {
      localStorage.clear();
      navigate("/login");
    }
  };

  const [storeInfo, setStoreInfo] = useState({
    id: null,
    userId: null,
    storeName: "",
    phone: "",
    address: "",
    description: "",
    openTime: "",
    closeTime: "",
    google_rating: 0,
    total_reviews: 0,
  });

  const [products, setProducts] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [storeLocation, setStoreLocation] = useState({ lat: null, lng: null });

  const normalizeCoordinate = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const geocodeStoreAddress = async (text) => {
    const query = String(text || "").trim();
    if (!query) return null;

    const params = new URLSearchParams({
      format: "json",
      q: `${query}, Đà Nẵng, Việt Nam`,
      limit: "1",
      addressdetails: "1",
      countrycodes: "vn",
      "accept-language": "vi",
      bounded: "1",
      viewbox: "108.06,16.20,108.31,15.97",
    });

    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Không thể chuyển địa chỉ cửa hàng thành tọa độ.");
    }

    const data = await res.json();
    const first = Array.isArray(data) ? data[0] : null;

    const lat = normalizeCoordinate(first?.lat);
    const lng = normalizeCoordinate(first?.lon);

    if (lat === null || lng === null) {
      return null;
    }

    return {
      lat,
      lng,
      address: first?.display_name || query,
    };
  };

const [currentPackage, setCurrentPackage] = useState("FREE");
const [showPaymentModal, setShowPaymentModal] = useState(false);
const [selectedPackageToBuy, setSelectedPackageToBuy] = useState(null);
const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("VNPAY");
const [isProcessingPayment, setIsProcessingPayment] = useState(false);
const [promotionForm, setPromotionForm] = useState({
  title: "",
  message: "",
  scheduledAt: "",
});
const [sendingPromotion, setSendingPromotion] = useState(false);
const [promotionResult, setPromotionResult] = useState(null);
const [promotionOverviewLoading, setPromotionOverviewLoading] = useState(false);
const [promotionOverview, setPromotionOverview] = useState({
  packageName: "FREE",
  monthlyLimit: 0,
  usedThisMonth: 0,
  remainingThisMonth: 0,
  summary: {
    totalCampaigns: 0,
    pendingApprovals: 0,
    scheduledCampaigns: 0,
    sentCampaigns: 0,
  },
  campaigns: [],
});
const [selectedCampaignDetail, setSelectedCampaignDetail] = useState(null);
const [showCampaignDetailModal, setShowCampaignDetailModal] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    specialty: "Sửa phần cứng",
    phone: "",
  });

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [requestToAssign, setRequestToAssign] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [storeStatus, setStoreStatus] = useState("");

  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    type: "Dịch vụ",
    price: "",
    image: "",
  });

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");

  const inputStyle = {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    outline: "none",
    fontSize: "15px",
    boxSizing: "border-box",
  };

  const detailInputStyle = {
    width: "100%",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#f8fafc",
    color: "#334155",
    outline: "none",
    fontSize: "15px",
    boxSizing: "border-box",
    marginTop: "8px",
  };

  const labelStyle = {
    display: "block",
    fontWeight: "bold",
    color: "#0f172a",
    fontSize: "15px",
  };

  const formatVND = (value) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  };

const formatDateTime = (value) => {
  if (!value) return "Chưa có";
  return new Date(value).toLocaleString("vi-VN");
};

const getCampaignStatusMeta = (status) => {
  const map = {
    PENDING_APPROVAL: { label: "Chờ duyệt", bg: "#fff7ed", color: "#ea580c" },
    APPROVED: { label: "Đã duyệt", bg: "#eff6ff", color: "#2563eb" },
    SCHEDULED: { label: "Đã lên lịch", bg: "#ecfeff", color: "#0891b2" },
    SENT: { label: "Đã gửi", bg: "#ecfdf5", color: "#059669" },
    REJECTED: { label: "Bị từ chối", bg: "#fef2f2", color: "#dc2626" },
    FAILED: { label: "Lỗi gửi", bg: "#fff1f2", color: "#e11d48" },
    SENDING: { label: "Đang gửi", bg: "#f8fafc", color: "#334155" },
  };

  return map[status] || { label: status || "Không xác định", bg: "#f8fafc", color: "#334155" };
};

const buildCampaignTimeline = (campaign) => {
  if (!campaign) return [];

  const timeline = [];
  timeline.push({
    title: "Tạo chiến dịch",
    time: campaign.requestedAt,
    description: "Store đã tạo chiến dịch và gửi yêu cầu chờ admin duyệt.",
    tone: "#2563eb",
  });

  if (campaign.approvedAt) {
    timeline.push({
      title: campaign.scheduledAt ? "Admin duyệt và cho phép lên lịch" : "Admin phê duyệt chiến dịch",
      time: campaign.approvedAt,
      description: campaign.approvedByName
        ? `Người duyệt: ${campaign.approvedByName}.`
        : "Chiến dịch đã được admin duyệt.",
      tone: "#0891b2",
    });
  }

  if (campaign.scheduledAt) {
    timeline.push({
      title: "Hẹn giờ phát hành",
      time: campaign.scheduledAt,
      description: "Chiến dịch được lên lịch gửi tự động theo thời gian đã chọn.",
      tone: "#7c3aed",
    });
  }

  if (campaign.sentAt) {
    timeline.push({
      title: "Phát hành chiến dịch",
      time: campaign.sentAt,
      description: `Đã gửi tới ${campaign.recipients || 0} người nhận.`,
      tone: "#059669",
    });
  }

  if (campaign.rejectedReason) {
    timeline.push({
      title: "Admin từ chối chiến dịch",
      time: campaign.approvedAt || campaign.requestedAt,
      description: campaign.rejectedReason,
      tone: "#dc2626",
    });
  }

  if (campaign.lastError) {
    timeline.push({
      title: "Lỗi phát hành",
      time: campaign.sentAt || campaign.approvedAt || campaign.requestedAt,
      description: campaign.lastError,
      tone: "#e11d48",
    });
  }

  return timeline;
};

const openCampaignDetail = (campaign) => {
  setSelectedCampaignDetail(campaign);
  setShowCampaignDetailModal(true);
};

const getPackagePrice = (packageName) => {
  if (packageName === "VERIFIED") return 500000;
  if (packageName === "PREMIUM") return 1000000;
  return 0;
};

const loadCurrentSubscription = async () => {
  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  if (!userData?.id) return;

  try {
    const res = await fetch(`http://localhost:5000/api/subscriptions/${userData.id}`);
    const data = await res.json();

    if (data && data.package_name) {
      setCurrentPackage(data.package_name);
    } else {
      setCurrentPackage("FREE");
    }
  } catch (err) {
    console.error("Lỗi tải gói:", err);
  }
};

const loadPromotionOverview = async () => {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    setPromotionOverviewLoading(true);
    const res = await fetch("http://localhost:5000/api/subscriptions/promotion-overview", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Không tải được thống kê quảng bá");
    }

    setPromotionOverview({
      packageName: data.packageName || "FREE",
      monthlyLimit: Number(data.monthlyLimit || 0),
      usedThisMonth: Number(data.usedThisMonth || 0),
      remainingThisMonth: Number(data.remainingThisMonth || 0),
      summary: {
        totalCampaigns: Number(data.summary?.totalCampaigns || 0),
        pendingApprovals: Number(data.summary?.pendingApprovals || 0),
        scheduledCampaigns: Number(data.summary?.scheduledCampaigns || 0),
        sentCampaigns: Number(data.summary?.sentCampaigns || 0),
      },
      campaigns: Array.isArray(data.campaigns) ? data.campaigns : [],
    });

    if (data.packageName) {
      setCurrentPackage(data.packageName);
    }
  } catch (error) {
    console.error("Lỗi tải overview quảng bá:", error);
  } finally {
    setPromotionOverviewLoading(false);
  }
};

  const CheckIcon = ({ color = "#10b981" }) => (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={3}
      stroke={color}
      style={{
        width: "16px",
        height: "16px",
        marginRight: "8px",
        flexShrink: 0,
        marginTop: "2px",
      }}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ định vị.");
      return;
    }

    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setStoreLocation({ lat, lng });

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await res.json();
          setStoreInfo((prev) => ({
            ...prev,
            address: data?.display_name || `${lat}, ${lng}`,
          }));
        } catch (err) {
          setStoreInfo((prev) => ({
            ...prev,
            address: `${lat}, ${lng}`,
          }));
        } finally {
          setLoadingLocation(false);
        }
      },
      (error) => {
        setLoadingLocation(false);
        alert("Không lấy được vị trí hiện tại.");
        console.error(error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData || !userData.id) return;

    fetch(`http://localhost:5000/api/stores/profile/${userData.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data) return;

        setStoreInfo({
          id: data.id || null,
          userId: data.user_id || userData.id || null,
          storeName: data.store_name || "",
          phone: data.phone || "",
          address: data.address || "",
          description: data.description || "",
          openTime: data.open_time || "",
          closeTime: data.close_time || "",
          google_rating: data.google_rating || data.rating_avg || 0,
          total_reviews: data.total_reviews || 0,
        });

        setStoreLocation({
          lat: data.latitude ?? null,
          lng: data.longitude ?? null,
        });

        setStoreStatus(data.status || "");
        setPromotionForm((prev) => ({
          title: prev.title || `Ưu đãi từ ${data.store_name || "cửa hàng của bạn"}`,
          message: prev.message,
        }));

        if (data.status === "approved" && !localStorage.getItem(`welcome_shown_${data.id}`)) {
          setShowApprovalModal(true);
          localStorage.setItem(`welcome_shown_${data.id}`, "true");
        }

        if (data.status === "rejected" && !localStorage.getItem(`rejection_shown_${data.id}`)) {
          setShowRejectionModal(true);
          localStorage.setItem(`rejection_shown_${data.id}`, "true");
        }
      })
      .catch((err) => console.error("Lỗi tải hồ sơ:", err));

    fetch(`http://localhost:5000/api/products/${userData.id}`)
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Lỗi tải sản phẩm:", err));

loadCurrentSubscription();
    loadPromotionOverview();
  }, []);

  useEffect(() => {
    if (!storeInfo?.id) return;

    fetch(`http://localhost:5000/api/employees/${storeInfo.id}`)
      .then((res) => res.json())
      .then((data) => setEmployees(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Lỗi tải nhân viên:", err));

    loadStoreRequests(storeInfo.id);
    loadStoreReviews(storeInfo.id);
  }, [storeInfo.id]);

  const handleInputChange = (e) => {
    setStoreInfo({ ...storeInfo, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData || !userData.id) return alert("Lỗi: Không tìm thấy ID tài khoản!");

    let nextStoreLocation = {
      lat: normalizeCoordinate(storeLocation.lat),
      lng: normalizeCoordinate(storeLocation.lng),
    };

    try {
      if ((nextStoreLocation.lat === null || nextStoreLocation.lng === null) && storeInfo.address.trim()) {
        setLoadingLocation(true);

        const geocoded = await geocodeStoreAddress(storeInfo.address);

        if (geocoded) {
          nextStoreLocation = {
            lat: geocoded.lat,
            lng: geocoded.lng,
          };

          setStoreLocation(nextStoreLocation);
          setStoreInfo((prev) => ({
            ...prev,
            address: geocoded.address || prev.address,
          }));
        }
      }

      if (nextStoreLocation.lat === null || nextStoreLocation.lng === null) {
        setLoadingLocation(false);
        return alert("Vui lòng bấm 'Lấy vị trí' hoặc nhập địa chỉ cụ thể để hệ thống xác định tọa độ cửa hàng.");
      }

      const payload = {
        storeName: storeInfo.storeName,
        phone: storeInfo.phone,
        address: storeInfo.address,
        description: storeInfo.description,
        openTime: storeInfo.openTime,
        closeTime: storeInfo.closeTime,
        userId: userData.id,
        latitude: nextStoreLocation.lat,
        longitude: nextStoreLocation.lng,
      };

      const response = await fetch("http://localhost:5000/api/stores/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        alert("✅ Đã lưu hồ sơ cửa hàng thành công!");
        localStorage.removeItem(`rejection_shown_${userData.id}`);
        setStoreInfo((prev) => ({ ...prev, userId: userData.id }));
        if (!storeStatus) {
          setStoreStatus("pending");
        }
      } else {
        alert("❌ Lỗi từ Database: " + (data.error || "Không rõ nguyên nhân"));
      }
    } catch (error) {
      console.error("Lỗi lưu hồ sơ cửa hàng:", error);
      alert(error.message || "❌ Lỗi mạng: Không thể kết nối đến máy chủ Backend!");
    } finally {
      setLoadingLocation(false);
    }
  };

  const mapStoreRequest = (req) => {
    let parsedDetail = {};

    try {
      parsedDetail =
        typeof req.detail_json === "string"
          ? JSON.parse(req.detail_json)
          : req.detail_json || {};
    } catch (e) {
      console.error("Lỗi parse detail_json:", e);
    }

    return {
      id: req.id,
      customer: req.customer_name || `Khách hàng (ID: ${req.user_id || "?"})`,
      device: req.device_name || req.brand || req.device_type || "Thiết bị chưa rõ",
      issue: req.issue_description || req.title || "Không có mô tả lỗi",
      status: req.status,
      employee_id: req.employee_id || null,
      employee_name: req.employee_name || null,
      quote_id: req.quote_id || null,
      quote_price: req.quote_price || 0,
      quote_message: req.quote_message || "",
      quote_estimated_time: req.quote_estimated_time || "",
      quote_status: req.quote_status || null,
      detail: {
        deviceType: parsedDetail.deviceType || req.device_type || "",
        brand: parsedDetail.brand || req.brand || "",
        model: parsedDetail.model || req.model || "",
        title: parsedDetail.title || req.title || "",
        categories: parsedDetail.categories || [],
        description: parsedDetail.description || req.description || "",
        receiveMethod: parsedDetail.receiveMethod || req.service_mode || "",
        budget: parsedDetail.budget || req.budget || "",
        desiredDate: parsedDetail.desiredDate || req.desired_date || "",
        phone: parsedDetail.phone || req.phone || "",
        address: parsedDetail.address || req.location || "",
        image: req.image || "",
      },
    };
  };

  const loadStoreRequests = async (realStoreId) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/repair-requests/store-orders/${realStoreId}?storeId=${realStoreId}`
      );
      const data = await res.json();
      setRequests(Array.isArray(data) ? data.map(mapStoreRequest) : []);
    } catch (err) {
      console.error("Lỗi tải danh sách yêu cầu:", err);
      setRequests([]);
    }
  };

  const loadStoreReviews = async (realStoreId) => {
    try {
      setReviewsLoading(true);
      setReviewsError("");

      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/repair-requests/store/${realStoreId}/reviews`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Không lấy được đánh giá");
      }

      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    } catch (error) {
      console.error("Lỗi lấy đánh giá:", error);
      setReviewsError(error.message || "Không tải được đánh giá");
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleRequest = async (id) => {
    try {
      const userData = JSON.parse(localStorage.getItem("user"));
      const token = localStorage.getItem("token") || (userData ? userData.token : "");

      const res = await fetch(`http://localhost:5000/api/repair-requests/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return;

      const responseData = await res.json();
      if (!responseData.success) return;

      const dbData = responseData.data;
      let parsedDetail = {};

      try {
        parsedDetail =
          typeof dbData.detail_json === "string"
            ? JSON.parse(dbData.detail_json)
            : dbData.detail_json || {};
      } catch (e) {
        console.error("Lỗi parse JSON:", e);
      }

      setSelectedRequest({
        id: dbData.id,
        customer: dbData.customer_name || `Khách hàng (ID: ${dbData.user_id})`,
        device: dbData.device_name || dbData.brand || dbData.device_type || "Thiết bị",
        issue: dbData.issue_description || dbData.title || "",
        status: dbData.status,
        employee_id: dbData.employee_id || null,
        employee_name: dbData.employee_name || null,
        quote_price: dbData.quote_price || 0,
        quote_message: dbData.quote_message || "",
        quote_estimated_time: dbData.quote_estimated_time || "",
        detail: {
          deviceType: parsedDetail.deviceType || dbData.device_type || "",
          brand: parsedDetail.brand || dbData.brand || "",
          model: parsedDetail.model || dbData.model || "",
          title: parsedDetail.title || dbData.title || "",
          categories: parsedDetail.categories || [],
          description: parsedDetail.description || dbData.description || "",
          receiveMethod: parsedDetail.receiveMethod || dbData.service_mode || "",
          budget: parsedDetail.budget || dbData.budget || "",
          desiredDate: parsedDetail.desiredDate || dbData.desired_date || "",
          phone: parsedDetail.phone || dbData.phone || "",
          address: parsedDetail.address || dbData.location || "",
          image: dbData.image || "",
        },
      });
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết:", error);
    }
  };

  const handleAcceptClick = (id) => {
    setRequestToAssign(id);
    if (employees.length > 0) {
      setSelectedEmployeeId(employees[0].id);
    } else {
      setSelectedEmployeeId("OWNER");
    }
    setAssignModalOpen(true);
  };

  const confirmAcceptOrder = async () => {
    if (!selectedEmployeeId) return alert("Vui lòng chọn người phụ trách!");

    try {
      const res = await fetch(
        `http://localhost:5000/api/repair-requests/store-orders/${requestToAssign}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "OPEN",
            employee_id: selectedEmployeeId === "OWNER" ? null : selectedEmployeeId,
          }),
        }
      );

      if (res.ok) {
        let assignedName = "Chủ cửa hàng tự làm";
        if (selectedEmployeeId !== "OWNER") {
          const emp = employees.find(
            (e) => e.id.toString() === selectedEmployeeId.toString()
          );
          if (emp) assignedName = emp.name;
        }

        setRequests(
          requests.map((req) =>
            req.id === requestToAssign
              ? { ...req, status: "OPEN", employee_name: assignedName }
              : req
          )
        );
        setAssignModalOpen(false);
        setRequestToAssign(null);
        alert(`✅ Đã giao đơn cho kỹ thuật viên: ${assignedName}. Kỹ thuật viên sẽ kiểm tra và gửi báo giá cho khách trước khi sửa.`);
      } else {
        alert("Lỗi khi nhận đơn. Vui lòng thử lại.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn từ chối yêu cầu này?")) {
      try {
        await fetch(
          `http://localhost:5000/api/repair-requests/store-orders/${id}/status`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "REJECTED" }),
          }
        );
        setRequests(requests.filter((req) => req.id !== id));
        setSelectedRequest(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleComplete = async (id) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/repair-requests/store-orders/${id}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "WAITING_CUSTOMER_CONFIRM" }),
        }
      );

      if (res.ok) {
        setRequests(
          requests.map((req) =>
            req.id === id ? { ...req, status: "WAITING_CUSTOMER_CONFIRM" } : req
          )
        );
        alert("🎉 Store đã báo hoàn thành cho khách hàng. Đang chờ khách xác nhận.");
      } else {
        const textError = await res.text();
        alert(`❌ Lỗi số ${res.status}: ${textError}`);
      }
    } catch (err) {
      alert(`❌ LỖI CỨNG: ${err.message}`);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewProduct({ ...newProduct, image: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData || !userData.id) return alert("Lỗi đăng nhập!");
    if (!newProduct.name || !newProduct.price) return alert("Vui lòng nhập Tên và Giá!");

    try {
      const res = await fetch("http://localhost:5000/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userData.id, ...newProduct }),
      });
      const data = await res.json();
      if (res.ok) {
        setProducts([{ id: data.id, ...newProduct }, ...products]);
        setNewProduct({ name: "", type: "Dịch vụ", price: "", image: "" });
        setShowAddForm(false);
        alert("✅ Đã thêm mặt hàng mới!");
      } else {
        alert("❌ Lỗi Database: " + data.error);
      }
    } catch (err) {
      alert("❌ Lỗi kết nối mạng!");
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("Bạn có chắc muốn xóa mặt hàng này khỏi cửa hàng?")) {
      try {
        const res = await fetch(`http://localhost:5000/api/products/${id}`, {
          method: "DELETE",
        });
        if (res.ok) setProducts(products.filter((p) => p.id !== id));
        else alert("❌ Có lỗi xảy ra khi xóa.");
      } catch (err) {
        alert("❌ Lỗi kết nối mạng!");
      }
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData || !userData.id) return alert("Lỗi đăng nhập!");
    if (!storeInfo?.id) return alert("Cửa hàng chưa có hồ sơ hoặc chưa lấy được ID cửa hàng!");
    if (!newEmployee.name || !newEmployee.specialty)
      return alert("Vui lòng nhập Tên và Chuyên môn!");

    try {
      const res = await fetch("http://localhost:5000/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: storeInfo.id, ...newEmployee }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmployees([{ id: data.id, ...newEmployee }, ...employees]);
        setNewEmployee({ name: "", specialty: "Sửa phần cứng", phone: "" });
        setShowAddEmployeeForm(false);
        alert("✅ Đã thêm nhân viên mới!");
      } else {
        alert("❌ Lỗi Database: " + data.error);
      }
    } catch (err) {
      alert("❌ Lỗi kết nối mạng!");
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (window.confirm("Bạn có chắc muốn xóa nhân viên này khỏi hệ thống?")) {
      try {
        const res = await fetch(`http://localhost:5000/api/employees/${id}`, {
          method: "DELETE",
        });
        if (res.ok) setEmployees(employees.filter((e) => e.id !== id));
        else alert("❌ Có lỗi xảy ra khi xóa.");
      } catch (err) {
        alert("❌ Lỗi kết nối mạng!");
      }
    }
  };

const handleOpenPayment = (packageName) => {
  setSelectedPackageToBuy(packageName);
  setSelectedPaymentMethod("VNPAY");
  setShowPaymentModal(true);
};

const handleConfirmPayment = () => {
  if (!selectedPackageToBuy) {
    alert("Vui lòng chọn gói cần thanh toán.");
    return;
  }

  setIsProcessingPayment(true);

  setTimeout(async () => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");

    try {
      const res = await fetch("http://localhost:5000/api/subscriptions/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userData.id,
          packageName: selectedPackageToBuy,
          durationDays: 30,
          paymentMethod: selectedPaymentMethod,
          paymentType: "FULL",
          isMockPayment: true,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        await loadCurrentSubscription();
        await loadPromotionOverview();
        setIsProcessingPayment(false);
        setShowPaymentModal(false);

        alert(
          `🎉 Thanh toán ảo thành công!\nGói: ${data.package_name}\nMã GD: ${data.transaction_code || "TEST"}`
        );
      } else {
        setIsProcessingPayment(false);
        alert(data.error || "Thanh toán thất bại");
      }
    } catch (err) {
      setIsProcessingPayment(false);
      alert("Lỗi kết nối nâng cấp gói!");
    }
  }, 1200);
};

const handleBroadcastPromotion = async () => {
  if (currentPackage !== "PREMIUM") {
    alert("Chỉ gói Premium mới được gửi yêu cầu ưu đãi hàng loạt.");
    return;
  }

  if (!promotionForm.title.trim() || !promotionForm.message.trim()) {
    alert("Vui lòng nhập tiêu đề và nội dung ưu đãi.");
    return;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    alert("Bạn cần đăng nhập lại để thực hiện chức năng này.");
    return;
  }

  try {
    setSendingPromotion(true);
    setPromotionResult(null);

    const res = await fetch("http://localhost:5000/api/subscriptions/broadcast-promotion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: promotionForm.title.trim(),
        message: promotionForm.message.trim(),
        scheduledAt: promotionForm.scheduledAt || null,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Không tạo được chiến dịch ưu đãi");
    }

    setPromotionResult({
      title: promotionForm.title.trim(),
      sentAt: new Date().toLocaleString("vi-VN"),
      scheduledAt: data.scheduledAt || null,
      status: data.status || "PENDING_APPROVAL",
    });

    setPromotionForm((prev) => ({
      ...prev,
      message: "",
      scheduledAt: "",
    }));

    await loadPromotionOverview();

    alert(
      data.scheduledAt
        ? "Đã gửi yêu cầu duyệt và hẹn giờ quảng bá thành công."
        : "Đã gửi admin duyệt chiến dịch quảng bá thành công."
    );
  } catch (error) {
    console.error("Lỗi gửi ưu đãi:", error);
    alert(error.message || "Không tạo được chiến dịch ưu đãi");
  } finally {
    setSendingPromotion(false);
  }
};
  const menuItems = [
    {
      id: "Hồ sơ",
      title: "Hồ sơ",
      subtitle: "Tài khoản và cài đặt",
      icon: (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: "20px", height: "20px" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      ),
    },
    {
      id: "Yêu cầu",
      title: "Yêu cầu sửa chữa",
      subtitle: "Chờ phê duyệt",
      icon: (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: "20px", height: "20px" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
      ),
    },
    {
      id: "Tiến độ",
      title: "Tiến độ sửa chữa",
      subtitle: "Cập nhật trạng thái",
      icon: (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: "20px", height: "20px" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      ),
    },
    {
      id: "Đánh giá",
      title: "Đánh giá",
      subtitle: "Nhận xét khách hàng",
      icon: (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: "20px", height: "20px" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m11.48 3.499 2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385c.148.621-.531 1.05-1.015.809L12 18.354l-4.73 2.365c-.484.24-1.163-.188-1.015-.809l1.285-5.385a.563.563 0 0 0-.182-.557L3.154 10.386c-.38-.325-.178-.948.321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
        </svg>
      ),
    },
    {
      id: "Nhân viên",
      title: "Nhân viên",
      subtitle: "Quản lý kỹ thuật viên",
      icon: (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: "20px", height: "20px" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      ),
    },
    {
      id: "Gói quảng bá",
      title: "Gói quảng bá",
      subtitle: "Nâng cấp hiển thị",
      icon: (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: "20px", height: "20px" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385c.148.621-.531 1.05-1.015.809l-4.73-2.365a.563.563 0 0 0-.528 0l-4.73 2.365c-.484.24-1.163-.188-1.015-.809l1.285-5.385a.563.563 0 0 0-.182-.557l-4.204-3.602c-.38-.325-.178-.948.321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
        </svg>
      ),
    },
    {
      id: "Sản phẩm",
      title: "Sản phẩm & Dịch vụ",
      subtitle: "Quản lý danh mục",
      icon: (
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: "20px", height: "20px" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      ),
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "Inter, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <StoreOwnerChatPanel
        storeId={storeInfo?.id || null}
        storeName={storeInfo?.storeName || "Cửa hàng của tôi"}
      />

      <div
        style={{
          width: "280px",
          backgroundColor: "#0f172a",
          color: "white",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          height: "100vh",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "40px", padding: "0 8px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              background: "linear-gradient(135deg, #60a5fa, #2563eb)",
              borderRadius: "16px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "white",
              fontWeight: "bold",
              fontSize: "15px",
              boxShadow: "0 4px 15px rgba(37, 99, 235, 0.4)",
            }}
          >
            IEMS
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "white" }}>
              Store Portal
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>
              Nền tảng sửa chữa thiết bị
            </p>
          </div>
        </div>

        <p
          style={{
            fontSize: "12px",
            fontWeight: "bold",
            color: "#64748b",
            margin: "0 0 16px 12px",
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          ĐIỀU HƯỚNG
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  backgroundColor: isActive ? "rgba(30, 41, 59, 0.8)" : "transparent",
                  border: isActive
                    ? "1px solid rgba(51, 65, 85, 0.8)"
                    : "1px solid transparent",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: isActive ? "#3b82f6" : "#1e293b",
                    color: isActive ? "white" : "#94a3b8",
                    marginRight: "16px",
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      fontWeight: isActive ? "700" : "500",
                      color: isActive ? "white" : "#cbd5e1",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "12px",
                      color: isActive ? "#94a3b8" : "#64748b",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: "auto",
            borderTop: "1px solid rgba(51, 65, 85, 0.5)",
            paddingTop: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                color: "white",
              }}
            >
              ST
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "bold", color: "white" }}>
                Store
              </h4>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#22c55e",
                  }}
                />
                <span style={{ fontSize: "12px", color: "#22c55e", fontWeight: "500" }}>
                  Đang hoạt động
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Đăng xuất"
            style={{
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "12px",
              backgroundColor: "rgba(30, 41, 59, 0.5)",
              color: "#f87171",
              border: "none",
              cursor: "pointer",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: "20px", height: "20px", minWidth: "20px", minHeight: "20px" }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, height: "100vh", padding: "40px", overflowY: "auto" }}>
        {activeTab === "Hồ sơ" && (
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <h1 style={{ color: "#0f172a", marginBottom: "8px", fontSize: "28px", fontWeight: "bold" }}>
              Trang hồ sơ và cài đặt
            </h1>
            <p style={{ color: "#64748b", marginBottom: "32px" }}>
              Quản lý thông tin và thiết lập hiển thị của cửa hàng.
            </p>

            <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
              <div
                style={{
                  width: "320px",
                  backgroundColor: "white",
                  borderRadius: "16px",
                  padding: "32px 24px",
                  textAlign: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <div
                  style={{
                    width: "100px",
                    height: "100px",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    borderRadius: "50%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: "36px",
                    fontWeight: "bold",
                    margin: "0 auto 20px auto",
                  }}
                >
                  TM
                </div>
                <h2 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "20px" }}>
                  {storeInfo.storeName || "Tên cửa hàng"}
                </h2>
                <p style={{ margin: "0 0 4px 0", color: "#64748b", fontSize: "14px" }}>
                  Cửa hàng đối tác IEMS
                </p>
                <p style={{ margin: "0 0 16px 0", color: "#94a3b8", fontSize: "13px" }}>
                  Tham gia từ 2026
                </p>

                <div style={{ textAlign: "left", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
                  <p style={{ margin: "0 0 4px 0", fontWeight: "bold", color: "#0f172a", fontSize: "14px" }}>
                    Số điện thoại hotline
                  </p>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                    {storeInfo.phone || "Đang cập nhật"}
                  </p>
                </div>

                <div style={{ textAlign: "left", borderTop: "1px solid #e2e8f0", paddingTop: "20px", marginTop: "20px" }}>
                  <p style={{ margin: "0 0 6px 0", fontWeight: "bold", color: "#0f172a", fontSize: "14px" }}>
                    Đánh giá trung bình
                  </p>
                  <p style={{ margin: 0, color: "#d97706", fontWeight: "bold", fontSize: "18px" }}>
                    ★ {storeInfo.google_rating || 0}
                  </p>
                  <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>
                    {storeInfo.total_reviews || 0} lượt đánh giá
                  </p>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  backgroundColor: "white",
                  borderRadius: "16px",
                  padding: "32px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#334155", fontSize: "14px" }}>
                      Tên cửa hàng
                    </label>
                    <input type="text" name="storeName" value={storeInfo.storeName} onChange={handleInputChange} style={inputStyle} />
                  </div>

                  <div style={{ display: "flex", gap: "20px" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#334155", fontSize: "14px" }}>
                        Số điện thoại
                      </label>
                      <input type="text" name="phone" value={storeInfo.phone} onChange={handleInputChange} style={inputStyle} />
                    </div>
                    <div style={{ display: "flex", gap: "10px", flex: 1 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#334155", fontSize: "14px" }}>
                          Giờ mở
                        </label>
                        <input type="time" name="openTime" value={storeInfo.openTime} onChange={handleInputChange} style={inputStyle} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#334155", fontSize: "14px" }}>
                          Giờ đóng
                        </label>
                        <input type="time" name="closeTime" value={storeInfo.closeTime} onChange={handleInputChange} style={inputStyle} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#334155", fontSize: "14px" }}>
                      Địa chỉ
                    </label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input type="text" name="address" value={storeInfo.address} onChange={handleInputChange} style={{ ...inputStyle, flex: 1 }} />
                      <button
                        type="button"
                        onClick={handleGetCurrentLocation}
                        disabled={loadingLocation}
                        style={{
                          backgroundColor: "#0ea5e9",
                          color: "white",
                          border: "none",
                          padding: "0 16px",
                          borderRadius: "8px",
                          fontWeight: "bold",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {loadingLocation ? "Đang lấy..." : "Lấy vị trí"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#334155", fontSize: "14px" }}>
                      Mô tả chuyên môn
                    </label>
                    <textarea
                      name="description"
                      value={storeInfo.description}
                      onChange={handleInputChange}
                      rows="4"
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      alignSelf: "flex-end",
                      backgroundColor: "#2563eb",
                      color: "white",
                      border: "none",
                      padding: "12px 24px",
                      borderRadius: "8px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Lưu thay đổi
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Yêu cầu" && (
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <h1 style={{ color: "#0f172a", marginBottom: "8px", fontSize: "28px", fontWeight: "bold" }}>
              Yêu cầu sửa chữa mới
            </h1>
            <p style={{ color: "#64748b", marginBottom: "32px" }}>
              Danh sách khách hàng đang chờ bạn duyệt đơn.
            </p>

            <div
              style={{
                backgroundColor: "white",
                padding: "24px",
                borderRadius: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                border: "1px solid #e2e8f0",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "16px", color: "#475569" }}>Khách hàng</th>
                    <th style={{ padding: "16px", color: "#475569" }}>Thiết bị</th>
                    <th style={{ padding: "16px", color: "#475569" }}>Lỗi gặp phải</th>
                    <th style={{ padding: "16px", color: "#475569", textAlign: "center" }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {requests
                    .filter((req) => req.status === "OPEN" && !req.employee_id)
                    .map((req) => (
                      <tr
                        key={req.id}
                        onClick={() => setSelectedRequest(req)}
                        style={{ borderBottom: "1px solid #e2e8f0", cursor: "pointer" }}
                      >
                        <td style={{ padding: "16px", fontWeight: "bold", color: "#0f172a" }}>
                          {req.customer}
                        </td>
                        <td style={{ padding: "16px", color: "#334155" }}>{req.device}</td>
                        <td style={{ padding: "16px", color: "#ef4444" }}>{req.issue}</td>
                        <td style={{ padding: "16px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleRequest(req.id)}
                            style={{
                              padding: "8px 16px",
                              backgroundColor: "#f8fafc",
                              color: "#2563eb",
                              border: "1px solid #bfdbfe",
                              borderRadius: "8px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              marginRight: "8px",
                            }}
                          >
                            Xem chi tiết
                          </button>
                          <button
                            onClick={() => handleAcceptClick(req.id)}
                            style={{
                              padding: "8px 16px",
                              backgroundColor: "#3b82f6",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              marginRight: "8px",
                            }}
                          >
                            Nhận đơn
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            style={{
                              padding: "8px 16px",
                              backgroundColor: "white",
                              color: "#ef4444",
                              border: "1px solid #fca5a5",
                              borderRadius: "8px",
                              fontWeight: "bold",
                              cursor: "pointer",
                            }}
                          >
                            Từ chối
                          </button>
                        </td>
                      </tr>
                    ))}
                  {requests.filter((req) => req.status === "OPEN" && !req.employee_id).length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                        Không có yêu cầu mới nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "Tiến độ" && (
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <h1 style={{ color: "#0f172a", marginBottom: "8px", fontSize: "28px", fontWeight: "bold" }}>
              Tiến độ máy đang sửa
            </h1>
            <p style={{ color: "#64748b", marginBottom: "32px" }}>
              Cập nhật trạng thái để khách hàng tiện theo dõi.
            </p>

            <div
              style={{
                backgroundColor: "white",
                padding: "24px",
                borderRadius: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                border: "1px solid #e2e8f0",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "16px", color: "#475569" }}>Khách hàng</th>
                    <th style={{ padding: "16px", color: "#475569" }}>Thiết bị</th>
                    <th style={{ padding: "16px", color: "#475569" }}>Nhân viên PT</th>
                    <th style={{ padding: "16px", color: "#475569" }}>Trạng thái</th>
                    <th style={{ padding: "16px", color: "#475569", textAlign: "center" }}>Cập nhật</th>
                  </tr>
                </thead>
                <tbody>
                  {requests
                    .filter(
                      (req) =>
                        (req.status === "OPEN" && req.employee_id) ||
                        req.status === "QUOTED" ||
                        req.status === "IN_PROGRESS" ||
                        req.status === "WAITING_STORE_CONFIRM" ||
                        req.status === "WAITING_CUSTOMER_CONFIRM" ||
                        req.status === "COMPLETED"
                    )
                    .map((req) => (
                      <tr key={req.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "16px", fontWeight: "bold", color: "#0f172a" }}>
                          {req.customer}
                        </td>
                        <td style={{ padding: "16px", color: "#334155" }}>{req.device}</td>
                        <td style={{ padding: "16px", color: "#2563eb", fontWeight: "500" }}>
                          {req.employee_name || "Chủ cửa hàng"}
                        </td>
                        <td style={{ padding: "16px" }}>
                          {req.status === "OPEN" && req.employee_id ? (
                            <span
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "#e0f2fe",
                                color: "#0369a1",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "bold",
                              }}
                            >
                              Đã giao kỹ thuật viên
                            </span>
                          ) : req.status === "QUOTED" ? (
                            <span
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "#fef3c7",
                                color: "#d97706",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "bold",
                              }}
                            >
                              Chờ khách duyệt báo giá
                            </span>
                          ) : req.status === "IN_PROGRESS" ? (
                            <span
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "#dbeafe",
                                color: "#2563eb",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "bold",
                              }}
                            >
                              KTV đang sửa chữa ⚙️
                            </span>
                          ) : req.status === "WAITING_STORE_CONFIRM" ? (
                            <span
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "#dcfce7",
                                color: "#15803d",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "bold",
                              }}
                            >
                              KTV đã báo sửa xong
                            </span>
                          ) : req.status === "WAITING_CUSTOMER_CONFIRM" ? (
                            <span
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "#fef9c3",
                                color: "#a16207",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "bold",
                              }}
                            >
                              Chờ khách xác nhận hoàn thành
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "#d1fae5",
                                color: "#059669",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "bold",
                              }}
                            >
                              Khách đã xác nhận ✅
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "16px", textAlign: "center" }}>
                          {req.status === "WAITING_STORE_CONFIRM" ? (
                            <button
                              onClick={() => handleComplete(req.id)}
                              style={{
                                padding: "8px 16px",
                                backgroundColor: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                fontWeight: "bold",
                                cursor: "pointer",
                              }}
                            >
                              Báo khách hoàn thành
                            </button>
                          ) : req.status === "QUOTED" ? (
                            <span style={{ color: "#d97706", fontSize: "13px", fontWeight: "bold" }}>
                              Giá đã báo: {req.quote_price ? formatVND(req.quote_price) : "Chờ nhập"}
                            </span>
                          ) : req.status === "OPEN" && req.employee_id ? (
                            <span style={{ color: "#0369a1", fontSize: "13px", fontWeight: "bold" }}>
                              KTV đang kiểm tra máy
                            </span>
                          ) : req.status === "IN_PROGRESS" ? (
                            <span style={{ color: "#2563eb", fontSize: "13px", fontWeight: "bold" }}>
                              KTV đang sửa chữa
                            </span>
                          ) : req.status === "WAITING_CUSTOMER_CONFIRM" ? (
                            <span style={{ color: "#a16207", fontSize: "13px", fontWeight: "bold" }}>
                              Đã báo khách · chờ xác nhận
                            </span>
                          ) : (
                            <span style={{ color: "#059669", fontSize: "14px", fontWeight: "bold" }}>
                              Đã bàn giao xong
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  {requests.filter((req) => (req.status === "OPEN" && req.employee_id) || req.status === "QUOTED" || req.status === "IN_PROGRESS" || req.status === "WAITING_STORE_CONFIRM" || req.status === "WAITING_CUSTOMER_CONFIRM" || req.status === "COMPLETED").length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                        Chưa có máy nào đang sửa.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "Đánh giá" && (
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
              <div>
                <h1 style={{ color: "#0f172a", marginBottom: "8px", fontSize: "28px", fontWeight: "bold" }}>
                  Đánh giá từ khách hàng
                </h1>
                <p style={{ color: "#64748b", margin: 0 }}>
                  Những nhận xét mới nhất sau khi đơn sửa chữa hoàn tất.
                </p>
              </div>
              <button
                onClick={() => loadStoreReviews(storeInfo.id)}
                style={{
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Tải lại
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
              <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: "14px", marginBottom: 8 }}>Điểm trung bình</div>
                <div style={{ color: "#d97706", fontWeight: "bold", fontSize: "30px" }}>★ {storeInfo.google_rating || 0}</div>
              </div>
              <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: "14px", marginBottom: 8 }}>Tổng lượt đánh giá</div>
                <div style={{ color: "#0f172a", fontWeight: "bold", fontSize: "30px" }}>{storeInfo.total_reviews || 0}</div>
              </div>
              <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0" }}>
                <div style={{ color: "#64748b", fontSize: "14px", marginBottom: 8 }}>Đánh giá đã tải</div>
                <div style={{ color: "#0f172a", fontWeight: "bold", fontSize: "30px" }}>{reviews.length}</div>
              </div>
            </div>

            {reviewsLoading && (
              <div style={{ backgroundColor: "#eff6ff", color: "#1d4ed8", padding: "16px", borderRadius: "12px", marginBottom: "16px" }}>
                Đang tải đánh giá...
              </div>
            )}

            {reviewsError && (
              <div style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "16px", borderRadius: "12px", marginBottom: "16px" }}>
                {reviewsError}
              </div>
            )}

            {!reviewsLoading && reviews.length === 0 && !reviewsError && (
              <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0", color: "#64748b" }}>
                Chưa có đánh giá nào từ khách hàng.
              </div>
            )}

            <div style={{ display: "grid", gap: "16px" }}>
              {reviews.map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "24px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                    <div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "6px 12px",
                          borderRadius: "999px",
                          backgroundColor: "#dcfce7",
                          color: "#166534",
                          fontWeight: "bold",
                          fontSize: "13px",
                          marginBottom: "12px",
                        }}
                      >
                        {item.rating}/5 ★
                      </div>
                      <h3 style={{ margin: "0 0 6px 0", color: "#0f172a" }}>{item.user_name || "Khách hàng"}</h3>
                      <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                        Đơn RQ-{item.request_id} · {item.device_name || "Thiết bị"}
                      </p>
                    </div>

                    <div style={{ color: "#64748b", fontSize: "14px", whiteSpace: "nowrap" }}>
                      {formatDateTime(item.created_at)}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "16px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "12px",
                      padding: "16px",
                      color: "#334155",
                      lineHeight: 1.6,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {item.comment || "Khách hàng không để lại nhận xét."}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "Nhân viên" && (
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
              <div>
                <h1 style={{ color: "#0f172a", marginBottom: "8px", fontSize: "28px", fontWeight: "bold" }}>
                  Quản lý Nhân viên (Kỹ thuật)
                </h1>
                <p style={{ color: "#64748b", margin: 0 }}>
                  Thêm nhân sự để tiện giao việc khi nhận đơn mới.
                </p>
              </div>
              <button
                onClick={() => setShowAddEmployeeForm(!showAddEmployeeForm)}
                style={{
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {showAddEmployeeForm ? "Đóng form" : "+ Thêm thợ mới"}
              </button>
            </div>

            {showAddEmployeeForm && (
              <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "16px", marginBottom: "24px", border: "1px solid #e2e8f0" }}>
                <form onSubmit={handleAddEmployee} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
                    <div style={{ flex: 2 }}>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569" }}>
                        Tên nhân viên
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Nguyễn Văn A..."
                        value={newEmployee.name}
                        onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569" }}>
                        Chuyên môn
                      </label>
                      <select
                        value={newEmployee.specialty}
                        onChange={(e) => setNewEmployee({ ...newEmployee, specialty: e.target.value })}
                        style={inputStyle}
                      >
                        <option>Sửa phần cứng</option>
                        <option>Sửa phần mềm</option>
                        <option>Ép kính - Màn hình</option>
                        <option>Đa năng</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569" }}>
                        Số điện thoại
                      </label>
                      <input
                        type="text"
                        placeholder="VD: 09..."
                        value={newEmployee.phone}
                        onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        backgroundColor: "#10b981",
                        color: "white",
                        border: "none",
                        padding: "12px 32px",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        height: "46px",
                      }}
                    >
                      Lưu lại
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div style={{ backgroundColor: "white", borderRadius: "16px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "16px", color: "#475569" }}>Tên nhân viên</th>
                    <th style={{ padding: "16px", color: "#475569" }}>Chuyên môn</th>
                    <th style={{ padding: "16px", color: "#475569" }}>Số điện thoại</th>
                    <th style={{ padding: "16px", textAlign: "center", color: "#475569" }}>Đuổi việc</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "16px", fontWeight: "600", color: "#0f172a", display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            backgroundColor: "#e2e8f0",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                            color: "#475569",
                          }}
                        >
                          {item.name?.charAt(0)}
                        </div>
                        {item.name}
                      </td>
                      <td style={{ padding: "16px" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            backgroundColor: "#fef3c7",
                            color: "#d97706",
                          }}
                        >
                          {item.specialty}
                        </span>
                      </td>
                      <td style={{ padding: "16px", fontWeight: "bold", color: "#0f172a" }}>
                        {item.phone || "Không có"}
                      </td>
                      <td style={{ padding: "16px", textAlign: "center" }}>
                        <button
                          onClick={() => handleDeleteEmployee(item.id)}
                          style={{ backgroundColor: "transparent", color: "#ef4444", border: "none", cursor: "pointer", fontSize: "18px" }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                        Cửa hàng chưa có nhân viên nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "Gói quảng bá" && (
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <h1 style={{ color: "#0f172a", marginBottom: "8px", fontSize: "28px", fontWeight: "bold" }}>
              Gói hiển thị cửa hàng
            </h1>
            <p style={{ color: "#64748b", marginBottom: "32px" }}>
              Nâng cấp quyền lợi để tiếp cận hàng ngàn khách hàng trên hệ thống IEMS.
            </p>

            <div
              style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                borderRadius: "20px",
                padding: "32px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "40px",
                border: "1px solid #334155",
              }}
            >
              <div>
                <span
                  style={{
                    backgroundColor: "rgba(251, 191, 36, 0.15)",
                    color: "#fbbf24",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    letterSpacing: "1px",
                    border: "1px solid rgba(251, 191, 36, 0.3)",
                  }}
                >
                  GÓI HIỆN TẠI CỦA BẠN
                </span>

                <h2 style={{ margin: "16px 0 8px 0", fontSize: "32px", color: "white" }}>
                  {currentPackage === "FREE"
                    ? "Chưa đăng ký gói"
                    : currentPackage === "VERIFIED"
                    ? "Cửa hàng Uy tín"
                    : "Đối Tác Chiến Lược"}
                </h2>
                <p style={{ margin: 0, color: "#cbd5e1", fontSize: "15px" }}>
                  Được cấp bởi Admin • Tự động gia hạn
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
              <div style={{ backgroundColor: "white", borderRadius: "20px", padding: "32px", border: "1px solid #e2e8f0" }}>
                <h3 style={{ margin: "0 0 8px 0", color: "#64748b", fontSize: "18px", fontWeight: "bold" }}>
                  Top Search
                </h3>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#0f172a", marginBottom: "24px" }}>
                  Ưu tiên hiển thị
                </div>
                <div style={{ height: "1px", backgroundColor: "#f1f5f9", margin: "20px 0" }} />
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "16px", color: "#475569", fontSize: "15px" }}>
                  <li style={{ display: "flex" }}><CheckIcon /> Tên cửa hàng lên top tìm kiếm</li>
                  <li style={{ display: "flex" }}><CheckIcon /> Hiển thị ngẫu nhiên trên Trang chủ</li>
                </ul>
                <button disabled style={{ width: "100%", marginTop: "32px", padding: "12px", borderRadius: "10px", backgroundColor: "#f1f5f9", color: "#64748b", fontWeight: "bold", border: "none" }}>
                  Mặc định
                </button>
              </div>

              <div style={{ backgroundColor: currentPackage === "VERIFIED" ? "#eff6ff" : "white", borderRadius: "20px", padding: "32px", border: "2px solid #3b82f6" }}>
                <h3 style={{ margin: "0 0 8px 0", color: "#3b82f6", fontSize: "18px", fontWeight: "bold" }}>
                  Verified Store
                </h3>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#0f172a", marginBottom: "24px" }}>
                  Cửa hàng Uy tín <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "normal" }}>(500,000 vnd)</span>
                </div>
                <div style={{ height: "1px", backgroundColor: "#f1f5f9", margin: "20px 0" }} />
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "16px", color: "#475569", fontSize: "15px" }}>
                  <li style={{ display: "flex" }}><CheckIcon color="#3b82f6" /> Lọc riêng trong mục "Cửa hàng uy tín"</li>
                  <li style={{ display: "flex" }}><CheckIcon color="#3b82f6" /> Gắn huy hiệu Xác thực xanh</li>
                  <li style={{ display: "flex" }}><CheckIcon color="#3b82f6" /> Đăng tải không giới hạn hình ảnh</li>
                </ul>
                {currentPackage === "VERIFIED" || currentPackage === "PREMIUM" ? (
                  <button disabled style={{ width: "100%", marginTop: "32px", padding: "12px", borderRadius: "10px", backgroundColor: "#3b82f6", color: "white", fontWeight: "bold", border: "none", opacity: 0.5 }}>
                    Đã kích hoạt
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenPayment("VERIFIED")}
                    style={{ width: "100%", marginTop: "32px", padding: "12px", borderRadius: "10px", backgroundColor: "white", color: "#3b82f6", border: "2px solid #3b82f6", fontWeight: "bold", cursor: "pointer" }}
                  >
                    Đăng ký gói này
                  </button>
                )}
              </div>

              <div style={{ backgroundColor: currentPackage === "PREMIUM" ? "#fffbeb" : "white", borderRadius: "20px", padding: "32px", border: "2px solid #fbbf24" }}>
                <h3 style={{ margin: "0 0 8px 0", color: "#d97706", fontSize: "18px", fontWeight: "bold" }}>
                  Premium Partner
                </h3>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#0f172a", marginBottom: "24px" }}>
                  Đối tác Chiến lược <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "normal" }}>(1,000,000 vnd)</span>
                </div>
                <div style={{ height: "1px", backgroundColor: "#fde68a", margin: "20px 0" }} />
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "16px", color: "#475569", fontSize: "15px" }}>
                  <li style={{ display: "flex" }}><CheckIcon color="#d97706" /> Bao gồm tất cả quyền lợi Gói Uy tín</li>
                  <li style={{ display: "flex" }}><CheckIcon color="#d97706" /> Đứng Top 1 vĩnh viễn khu vực lân cận</li>
                  <li style={{ display: "flex" }}><CheckIcon color="#d97706" /> Nhắn tin ưu đãi đến toàn bộ User</li>
                </ul>
                {currentPackage === "PREMIUM" ? (
                  <button style={{ width: "100%", marginTop: "32px", padding: "12px", borderRadius: "10px", backgroundColor: "#fbbf24", color: "#0f172a", fontWeight: "bold", border: "none" }}>
                    Đang kích hoạt
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenPayment("PREMIUM")}
                    style={{ width: "100%", marginTop: "32px", padding: "12px", borderRadius: "10px", backgroundColor: "white", color: "#d97706", border: "2px solid #fbbf24", fontWeight: "bold", cursor: "pointer" }}
                  >
                    Đăng ký gói này
                  </button>
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: "28px",
                backgroundColor: "white",
                borderRadius: "20px",
                padding: "28px",
                border: currentPackage === "PREMIUM" ? "1px solid #fde68a" : "1px solid #e2e8f0",
                boxShadow: currentPackage === "PREMIUM" ? "0 12px 32px rgba(217, 119, 6, 0.08)" : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "22px", fontWeight: "bold" }}>
                    Trung tâm quảng bá có duyệt nội dung
                  </h3>
                  <p style={{ margin: 0, color: "#64748b", lineHeight: 1.6 }}>
                    Premium được tạo chiến dịch, giới hạn {promotionOverview.monthlyLimit || 0} lượt mỗi tháng, có hẹn giờ gửi và bắt buộc admin duyệt trước khi phát hành.
                  </p>
                </div>

                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "999px",
                    fontWeight: "bold",
                    fontSize: "14px",
                    backgroundColor: currentPackage === "PREMIUM" ? "#fef3c7" : "#f1f5f9",
                    color: currentPackage === "PREMIUM" ? "#92400e" : "#64748b",
                  }}
                >
                  {currentPackage === "PREMIUM" ? "Premium đang hoạt động" : "Cần nâng cấp Premium"}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "14px", marginTop: "22px" }}>
                {[
                  { label: "Giới hạn tháng này", value: promotionOverview.monthlyLimit, tone: ["#eff6ff", "#2563eb"] },
                  { label: "Đã dùng", value: promotionOverview.usedThisMonth, tone: ["#fff7ed", "#ea580c"] },
                  { label: "Còn lại", value: promotionOverview.remainingThisMonth, tone: ["#ecfdf5", "#059669"] },
                  { label: "Chờ admin duyệt", value: promotionOverview.summary?.pendingApprovals || 0, tone: ["#f8fafc", "#334155"] },
                ].map((box) => (
                  <div
                    key={box.label}
                    style={{
                      backgroundColor: box.tone[0],
                      border: "1px solid #e2e8f0",
                      borderRadius: "16px",
                      padding: "18px",
                    }}
                  >
                    <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>{box.label}</div>
                    <div style={{ fontSize: "28px", fontWeight: "800", color: box.tone[1] }}>{box.value || 0}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px", marginTop: "24px" }}>
                <div style={{ display: "grid", gap: "16px" }}>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: "8px" }}>Tiêu đề ưu đãi</label>
                    <input
                      value={promotionForm.title}
                      onChange={(e) => setPromotionForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Ví dụ: Giảm 20% thay pin tuần này"
                      style={inputStyle}
                      disabled={currentPackage !== "PREMIUM" || sendingPromotion}
                    />
                  </div>

                  <div>
                    <label style={{ ...labelStyle, marginBottom: "8px" }}>Nội dung gửi đến User</label>
                    <textarea
                      value={promotionForm.message}
                      onChange={(e) => setPromotionForm((prev) => ({ ...prev, message: e.target.value }))}
                      placeholder="Nhập nội dung ưu đãi, thời gian áp dụng, điều kiện..."
                      style={{
                        ...inputStyle,
                        minHeight: "160px",
                        resize: "vertical",
                        lineHeight: 1.6,
                      }}
                      disabled={currentPackage !== "PREMIUM" || sendingPromotion}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gap: "16px", alignContent: "start" }}>
                  <div>
                    <label style={{ ...labelStyle, marginBottom: "8px" }}>Hẹn giờ gửi</label>
                    <input
                      type="datetime-local"
                      value={promotionForm.scheduledAt}
                      onChange={(e) => setPromotionForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                      style={inputStyle}
                      disabled={currentPackage !== "PREMIUM" || sendingPromotion}
                    />
                    <div style={{ fontSize: "13px", color: "#64748b", marginTop: "8px", lineHeight: 1.5 }}>
                      Để trống nếu muốn admin duyệt xong là gửi ngay. Nếu chọn thời gian tương lai, hệ thống sẽ tự phát đúng giờ sau khi được duyệt.
                    </div>
                  </div>

                  <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "16px" }}>
                    <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "10px" }}>Theo dõi hiệu quả</div>
                    <div style={{ display: "grid", gap: "10px", fontSize: "14px", color: "#475569" }}>
                      <div>• Số người nhận được lưu ngay khi chiến dịch phát hành.</div>
                      <div>• Mở / xem được tính khi user mở thông báo.</div>
                      <div>• Click được tính khi user bấm vào thông báo ưu đãi.</div>
                      <div>• Admin có thể duyệt hoặc từ chối từng chiến dịch trước khi gửi.</div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginTop: "18px",
                }}
              >
                <div style={{ color: "#64748b", fontSize: "14px" }}>
                  Premium sẽ được ưu tiên Top 1 ở danh sách cửa hàng gần người dùng và có thể tạo chiến dịch quảng bá hàng loạt theo quota tháng.
                </div>

                <button
                  type="button"
                  onClick={handleBroadcastPromotion}
                  disabled={currentPackage !== "PREMIUM" || sendingPromotion}
                  style={{
                    padding: "12px 22px",
                    borderRadius: "12px",
                    border: "none",
                    backgroundColor: currentPackage === "PREMIUM" ? "#d97706" : "#cbd5e1",
                    color: currentPackage === "PREMIUM" ? "white" : "#475569",
                    fontWeight: "bold",
                    cursor: currentPackage === "PREMIUM" && !sendingPromotion ? "pointer" : "not-allowed",
                    opacity: sendingPromotion ? 0.7 : 1,
                  }}
                >
                  {sendingPromotion ? "Đang tạo chiến dịch..." : "Gửi admin duyệt chiến dịch"}
                </button>
              </div>

              {promotionResult && (
                <div
                  style={{
                    marginTop: "16px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    padding: "16px 18px",
                    color: "#334155",
                  }}
                >
                  <div style={{ fontWeight: "bold", marginBottom: "6px", color: "#0f172a" }}>
                    Đã gửi yêu cầu duyệt chiến dịch
                  </div>
                  <div>Tiêu đề: {promotionResult.title}</div>
                  <div>Trạng thái: {promotionResult.status}</div>
                  <div>Thời gian tạo: {promotionResult.sentAt}</div>
                  {promotionResult.scheduledAt && <div>Hẹn giờ: {formatDateTime(promotionResult.scheduledAt)}</div>}
                </div>
              )}

              <div style={{ marginTop: "28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "20px", color: "#0f172a" }}>Lịch sử chiến dịch quảng bá</h3>
                    <p style={{ margin: "6px 0 0", color: "#64748b" }}>Theo dõi trạng thái duyệt, số người mở / click và thời gian hẹn gửi.</p>
                  </div>
                  <button
                    type="button"
                    onClick={loadPromotionOverview}
                    style={{
                      border: "1px solid #cbd5e1",
                      backgroundColor: "white",
                      color: "#334155",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Làm mới thống kê
                  </button>
                </div>

                <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "16px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "960px", backgroundColor: "white" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc" }}>
                        <th style={{ padding: "14px", textAlign: "left", color: "#475569" }}>Chiến dịch</th>
                        <th style={{ padding: "14px", textAlign: "left", color: "#475569" }}>Trạng thái</th>
                        <th style={{ padding: "14px", textAlign: "left", color: "#475569" }}>Hẹn giờ</th>
                        <th style={{ padding: "14px", textAlign: "left", color: "#475569" }}>Người nhận</th>
                        <th style={{ padding: "14px", textAlign: "left", color: "#475569" }}>Mở / xem</th>
                        <th style={{ padding: "14px", textAlign: "left", color: "#475569" }}>Click</th>
                        <th style={{ padding: "14px", textAlign: "left", color: "#475569" }}>Ghi chú</th>
                        <th style={{ padding: "14px", textAlign: "left", color: "#475569" }}>Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promotionOverviewLoading ? (
                        <tr>
                          <td colSpan="8" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                            Đang tải thống kê chiến dịch...
                          </td>
                        </tr>
                      ) : promotionOverview.campaigns.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                            Bạn chưa tạo chiến dịch quảng bá nào.
                          </td>
                        </tr>
                      ) : (
                        promotionOverview.campaigns.map((campaign) => {
                          const statusMap = {
                            PENDING_APPROVAL: ["Chờ duyệt", "#fff7ed", "#ea580c"],
                            APPROVED: ["Đã duyệt", "#eff6ff", "#2563eb"],
                            SCHEDULED: ["Đã lên lịch", "#ecfeff", "#0891b2"],
                            SENT: ["Đã gửi", "#ecfdf5", "#059669"],
                            REJECTED: ["Bị từ chối", "#fef2f2", "#dc2626"],
                            FAILED: ["Lỗi gửi", "#fff1f2", "#e11d48"],
                            SENDING: ["Đang gửi", "#f8fafc", "#334155"],
                          };
                          const badge = statusMap[campaign.status] || [campaign.status, "#f8fafc", "#334155"];
                          return (
                            <tr key={campaign.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "14px", verticalAlign: "top" }}>
                                <div style={{ fontWeight: "700", color: "#0f172a", marginBottom: "4px" }}>{campaign.title}</div>
                                <div style={{ color: "#64748b", lineHeight: 1.5, maxWidth: "280px" }}>{campaign.message}</div>
                                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "6px" }}>Tạo lúc: {formatDateTime(campaign.requestedAt)}</div>
                              </td>
                              <td style={{ padding: "14px", verticalAlign: "top" }}>
                                <span style={{ backgroundColor: badge[1], color: badge[2], padding: "6px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "700" }}>{badge[0]}</span>
                                {campaign.approvedByName && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "8px" }}>Duyệt bởi: {campaign.approvedByName}</div>}
                              </td>
                              <td style={{ padding: "14px", verticalAlign: "top", color: "#334155" }}>{formatDateTime(campaign.scheduledAt)}</td>
                              <td style={{ padding: "14px", verticalAlign: "top", fontWeight: "700", color: "#0f172a" }}>{campaign.recipients || 0}</td>
                              <td style={{ padding: "14px", verticalAlign: "top", color: "#0f172a" }}>{campaign.opened || 0} <span style={{ color: "#64748b", fontWeight: "400" }}>({campaign.openRate || 0}%)</span></td>
                              <td style={{ padding: "14px", verticalAlign: "top", color: "#0f172a" }}>{campaign.clicked || 0} <span style={{ color: "#64748b", fontWeight: "400" }}>({campaign.clickRate || 0}%)</span></td>
                              <td style={{ padding: "14px", verticalAlign: "top", color: campaign.rejectedReason ? "#dc2626" : "#64748b", maxWidth: "220px" }}>
                                {campaign.rejectedReason || campaign.lastError || "—"}
                              </td>
                              <td style={{ padding: "14px", verticalAlign: "top" }}>
                                <button
                                  type="button"
                                  onClick={() => openCampaignDetail(campaign)}
                                  style={{
                                    border: "1px solid #cbd5e1",
                                    backgroundColor: "white",
                                    color: "#0f172a",
                                    borderRadius: "10px",
                                    padding: "10px 12px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  Xem chi tiết
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Sản phẩm" && (
          <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px" }}>
              <div>
                <h1 style={{ color: "#0f172a", marginBottom: "8px", fontSize: "28px", fontWeight: "bold" }}>
                  Kho Sản phẩm & Dịch vụ
                </h1>
                <p style={{ color: "#64748b", margin: 0 }}>
                  Thêm/xóa các mặt hàng kinh doanh.
                </p>
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                style={{
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {showAddForm ? "Đóng form" : "+ Thêm mặt hàng mới"}
              </button>
            </div>

            {showAddForm && (
              <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "16px", marginBottom: "24px", border: "1px solid #e2e8f0" }}>
                <form onSubmit={handleAddProduct} style={{ display: "grid", gap: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569" }}>
                        Tên mặt hàng
                      </label>
                      <input
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        placeholder="Ví dụ: Ép kính iPhone 12"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569" }}>
                        Loại
                      </label>
                      <select
                        value={newProduct.type}
                        onChange={(e) => setNewProduct({ ...newProduct, type: e.target.value })}
                        style={inputStyle}
                      >
                        <option>Dịch vụ</option>
                        <option>Sản phẩm</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569" }}>
                        Giá
                      </label>
                      <input
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                        placeholder="100000"
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569" }}>
                      Ảnh
                    </label>
                    <input type="file" accept="image/*" onChange={handleImageUpload} />
                  </div>

                  {newProduct.image && (
                    <img
                      src={newProduct.image}
                      alt="preview"
                      style={{
                        width: "160px",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                  )}

                  <div style={{ textAlign: "right" }}>
                    <button
                      type="submit"
                      style={{
                        backgroundColor: "#10b981",
                        color: "white",
                        border: "none",
                        padding: "12px 24px",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      Lưu sản phẩm
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
              {products.map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    padding: "16px",
                  }}
                >
                  <img
                    src={item.image || "https://placehold.co/220x160?text=No+Image"}
                    alt={item.name}
                    style={{
                      width: "100%",
                      height: "140px",
                      objectFit: "cover",
                      borderRadius: "10px",
                      marginBottom: "12px",
                    }}
                  />
                  <h4 style={{ margin: "0 0 8px 0", color: "#0f172a" }}>{item.name}</h4>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      backgroundColor: item.type === "Dịch vụ" ? "#dbeafe" : "#fef3c7",
                      color: item.type === "Dịch vụ" ? "#2563eb" : "#d97706",
                    }}
                  >
                    {item.type}
                  </span>
                  <div style={{ marginTop: "12px", fontWeight: "bold", color: "#ef4444", fontSize: "16px" }}>
                    {formatVND(item.price)}
                  </div>
                  <button
                    onClick={() => handleDeleteProduct(item.id)}
                    style={{
                      marginTop: "12px",
                      width: "100%",
                      backgroundColor: "#fff1f2",
                      color: "#e11d48",
                      border: "1px solid #fecdd3",
                      padding: "10px",
                      borderRadius: "10px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Xóa
                  </button>
                </div>
              ))}
              {products.length === 0 && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    backgroundColor: "white",
                    borderRadius: "16px",
                    padding: "24px",
                    border: "1px solid #e2e8f0",
                    color: "#64748b",
                  }}
                >
                  Chưa có sản phẩm hoặc dịch vụ nào.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {assignModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 50, backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", width: "100%", maxWidth: "520px", padding: "32px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.12)" }}>
            <h2 style={{ marginTop: 0, color: "#0f172a" }}>Giao việc cho kỹ thuật viên</h2>
            <p style={{ color: "#64748b", marginBottom: "20px" }}>
              Chọn người phụ trách xử lý đơn này.
            </p>

            {employees.length > 0 ? (
              <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)} style={inputStyle}>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} - {emp.specialty}
                  </option>
                ))}
                <option value="OWNER">Chủ cửa hàng tự làm</option>
              </select>
            ) : (
              <p style={{ color: "#d97706", fontWeight: "500" }}>
                Bạn chưa có thợ nào. Mặc định chủ shop sẽ nhận đơn.
              </p>
            )}

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              <button
                onClick={() => {
                  setAssignModalOpen(false);
                  setRequestToAssign(null);
                }}
                style={{ flex: 1, padding: "12px", backgroundColor: "white", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmAcceptOrder}
                style={{ flex: 2, padding: "12px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}
              >
                Xác nhận Nhận Đơn
              </button>
            </div>
          </div>
        </div>
      )}

{showPaymentModal && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(15, 23, 42, 0.8)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 100,
      backdropFilter: "blur(4px)",
    }}
  >
    <div
      style={{
        backgroundColor: "white",
        width: "480px",
        borderRadius: "20px",
        padding: "32px",
        textAlign: "center",
      }}
    >
      <h2 style={{ color: "#0f172a", marginTop: 0 }}>Thanh toán Gói Cước</h2>

      <p style={{ color: "#64748b", marginBottom: "8px" }}>
        Bạn đang đăng ký gói:{" "}
        <strong
          style={{
            color: selectedPackageToBuy === "PREMIUM" ? "#d97706" : "#2563eb",
          }}
        >
          {selectedPackageToBuy}
        </strong>
      </p>

      <div
        style={{
          marginBottom: "18px",
          fontWeight: "700",
          fontSize: "20px",
          color: "#0f172a",
        }}
      >
        {formatVND(getPackagePrice(selectedPackageToBuy))}
      </div>

      <div
        style={{
          textAlign: "left",
          marginBottom: "18px",
        }}
      >
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: "bold",
            color: "#0f172a",
          }}
        >
          Chọn phương thức thanh toán
        </label>

        <select
          value={selectedPaymentMethod}
          onChange={(e) => setSelectedPaymentMethod(e.target.value)}
          disabled={isProcessingPayment}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #cbd5e1",
            backgroundColor: "white",
            fontSize: "15px",
          }}
        >
          <option value="VNPAY">VNPAY</option>
          <option value="MOMO">MOMO</option>
          <option value="BANK_TRANSFER">Chuyển khoản ngân hàng</option>
          <option value="CASH">Tiền mặt</option>
        </select>
      </div>

      <div
        style={{
          padding: "20px",
          backgroundColor: "#f8fafc",
          borderRadius: "12px",
          border: "1px dashed #cbd5e1",
          marginBottom: "24px",
        }}
      >
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=MockPay-${selectedPackageToBuy}-${selectedPaymentMethod}-${getPackagePrice(selectedPackageToBuy)}`}
          alt="QR thanh toán"
          style={{
            width: "220px",
            height: "220px",
            margin: "0 auto 16px auto",
            display: "block",
          }}
        />
        <p style={{ margin: "0 0 6px 0", color: "#475569", fontWeight: "600" }}>
          Quét QR để thanh toán mô phỏng
        </p>
        <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
          Đây là chế độ test, bấm “Tôi đã thanh toán” để ghi nhận giao dịch ảo.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
        }}
      >
        <button
          onClick={() => {
            if (isProcessingPayment) return;
            setShowPaymentModal(false);
          }}
          disabled={isProcessingPayment}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "10px",
            border: "1px solid #cbd5e1",
            backgroundColor: "white",
            color: "#475569",
            fontWeight: "bold",
            cursor: isProcessingPayment ? "not-allowed" : "pointer",
          }}
        >
          Đóng
        </button>

        <button
          onClick={handleConfirmPayment}
          disabled={isProcessingPayment}
          style={{
            flex: 1.4,
            padding: "12px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: "#2563eb",
            color: "white",
            fontWeight: "bold",
            cursor: isProcessingPayment ? "not-allowed" : "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {isProcessingPayment ? "Đang kiểm tra..." : "Tôi đã thanh toán"}
        </button>
      </div>
    </div>
  </div>
)}

      {selectedRequest && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 50, backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", width: "100%", maxWidth: "600px", padding: "32px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #e2e8f0" }}>
              <h2 style={{ margin: 0, color: "#0f172a", fontSize: "20px", fontWeight: "bold" }}>
                Chi tiết yêu cầu sửa chữa
              </h2>
              <button onClick={() => setSelectedRequest(null)} style={{ background: "transparent", border: "none", fontSize: "24px", color: "#64748b", cursor: "pointer", padding: "0 8px" }}>
                &times;
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", gap: "20px" }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Loại thiết bị</label>
                  <input readOnly value={selectedRequest.detail.deviceType} style={detailInputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Thương hiệu</label>
                  <input readOnly value={selectedRequest.detail.brand} style={detailInputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Model / dòng máy</label>
                <input type="text" readOnly value={selectedRequest.detail.model} style={detailInputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Tiêu đề lỗi</label>
                <input type="text" readOnly value={selectedRequest.detail.title} style={detailInputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Mô tả chi tiết</label>
                <textarea readOnly value={selectedRequest.detail.description} rows={4} style={detailInputStyle} />
              </div>

              <div style={{ display: "flex", gap: "20px" }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Ngân sách</label>
                  <input readOnly value={selectedRequest.detail.budget} style={detailInputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Ngày mong muốn</label>
                  <input readOnly value={selectedRequest.detail.desiredDate} style={detailInputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Số điện thoại</label>
                <input readOnly value={selectedRequest.detail.phone} style={detailInputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Địa chỉ</label>
                <textarea readOnly value={selectedRequest.detail.address} rows={3} style={detailInputStyle} />
              </div>

              {selectedRequest.detail.image && (
                <div>
                  <label style={labelStyle}>Ảnh khách gửi</label>
                  <img
                    src={selectedRequest.detail.image}
                    alt="repair-request"
                    style={{ width: "100%", maxHeight: "280px", objectFit: "cover", borderRadius: "14px", border: "1px solid #e2e8f0", marginTop: "8px" }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCampaignDetailModal && selectedCampaignDetail && (
        <div
          onClick={() => setShowCampaignDetailModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15,23,42,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 120,
            padding: "24px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(960px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              backgroundColor: "white",
              borderRadius: "24px",
              padding: "28px",
              boxShadow: "0 25px 80px rgba(15, 23, 42, 0.25)",
            }}
          >
            {(() => {
              const statusMeta = getCampaignStatusMeta(selectedCampaignDetail.status);
              const timeline = buildCampaignTimeline(selectedCampaignDetail);
              return (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "22px" }}>
                    <div>
                      <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px", fontWeight: "700", letterSpacing: "0.3px" }}>
                        CHI TIẾT CHIẾN DỊCH #{selectedCampaignDetail.id}
                      </div>
                      <h2 style={{ margin: 0, color: "#0f172a", fontSize: "28px", lineHeight: 1.3 }}>{selectedCampaignDetail.title}</h2>
                      <div style={{ marginTop: "10px" }}>
                        <span style={{ backgroundColor: statusMeta.bg, color: statusMeta.color, padding: "7px 12px", borderRadius: "999px", fontWeight: "700", fontSize: "12px" }}>
                          {statusMeta.label}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowCampaignDetailModal(false)}
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        border: "1px solid #e2e8f0",
                        backgroundColor: "white",
                        fontSize: "20px",
                        cursor: "pointer",
                        color: "#64748b",
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "22px", alignItems: "start" }}>
                    <div style={{ display: "grid", gap: "18px" }}>
                      <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "18px", padding: "18px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "10px" }}>Nội dung quảng bá</div>
                        <div style={{ color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{selectedCampaignDetail.message || "Không có nội dung"}</div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px" }}>
                        {[
                          { label: "Tạo lúc", value: formatDateTime(selectedCampaignDetail.requestedAt) },
                          { label: "Hẹn giờ gửi", value: selectedCampaignDetail.scheduledAt ? formatDateTime(selectedCampaignDetail.scheduledAt) : "Gửi ngay khi được duyệt" },
                          { label: "Admin duyệt", value: selectedCampaignDetail.approvedByName || "Chưa có" },
                          { label: "Thời gian duyệt", value: selectedCampaignDetail.approvedAt ? formatDateTime(selectedCampaignDetail.approvedAt) : "Chưa có" },
                          { label: "Thời gian phát hành", value: selectedCampaignDetail.sentAt ? formatDateTime(selectedCampaignDetail.sentAt) : "Chưa phát hành" },
                          { label: "Quota tại thời điểm tạo", value: `${selectedCampaignDetail.monthlyLimitSnapshot || 0} lượt / tháng` },
                        ].map((item) => (
                          <div key={item.label} style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "16px" }}>
                            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>{item.label}</div>
                            <div style={{ color: "#0f172a", fontWeight: "700", lineHeight: 1.5 }}>{item.value}</div>
                          </div>
                        ))}
                      </div>

                      {(selectedCampaignDetail.rejectedReason || selectedCampaignDetail.lastError) && (
                        <div style={{ backgroundColor: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "18px", padding: "18px" }}>
                          <div style={{ fontSize: "14px", fontWeight: "700", color: "#9a3412", marginBottom: "8px" }}>Ghi chú xử lý</div>
                          <div style={{ color: "#9a3412", lineHeight: 1.6 }}>
                            {selectedCampaignDetail.rejectedReason || selectedCampaignDetail.lastError}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "grid", gap: "18px" }}>
                      <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "18px", padding: "18px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>Hiệu quả chiến dịch</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" }}>
                          {[
                            { label: "Người nhận", value: selectedCampaignDetail.recipients || 0, bg: "#eff6ff", color: "#2563eb" },
                            { label: "Mở / xem", value: `${selectedCampaignDetail.opened || 0} (${selectedCampaignDetail.openRate || 0}%)`, bg: "#ecfdf5", color: "#059669" },
                            { label: "Click", value: `${selectedCampaignDetail.clicked || 0} (${selectedCampaignDetail.clickRate || 0}%)`, bg: "#f5f3ff", color: "#7c3aed" },
                          ].map((item) => (
                            <div key={item.label} style={{ backgroundColor: item.bg, borderRadius: "14px", padding: "14px" }}>
                              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>{item.label}</div>
                              <div style={{ fontWeight: "800", color: item.color, lineHeight: 1.5 }}>{item.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "18px", padding: "18px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>Lịch sử duyệt / phát hành</div>
                        <div style={{ display: "grid", gap: "14px" }}>
                          {timeline.length === 0 ? (
                            <div style={{ color: "#64748b" }}>Chưa có lịch sử xử lý.</div>
                          ) : (
                            timeline.map((item, index) => (
                              <div key={`${item.title}-${index}`} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                                <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: item.tone, marginTop: "6px", flexShrink: 0 }} />
                                <div>
                                  <div style={{ fontWeight: "700", color: "#0f172a" }}>{item.title}</div>
                                  <div style={{ fontSize: "12px", color: "#64748b", margin: "4px 0" }}>{formatDateTime(item.time)}</div>
                                  <div style={{ color: "#475569", lineHeight: 1.6 }}>{item.description}</div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {showApprovalModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90 }}>
          <div style={{ width: "460px", background: "white", borderRadius: "20px", padding: "32px", textAlign: "center" }}>
            <h2 style={{ color: "#16a34a", marginTop: 0 }}>🎉 Cửa hàng đã được phê duyệt</h2>
            <p style={{ color: "#475569" }}>
              Admin đã duyệt hồ sơ cửa hàng của bạn. Bây giờ bạn có thể nhận đơn từ khách hàng.
            </p>
            <button
              onClick={() => setShowApprovalModal(false)}
              style={{ marginTop: "20px", backgroundColor: "#2563eb", color: "white", border: "none", padding: "12px 24px", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {showRejectionModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90 }}>
          <div style={{ width: "460px", background: "white", borderRadius: "20px", padding: "32px", textAlign: "center" }}>
            <h2 style={{ color: "#dc2626", marginTop: 0 }}>❌ Hồ sơ cửa hàng bị từ chối</h2>
            <p style={{ color: "#475569" }}>
              Admin chưa duyệt hồ sơ cửa hàng của bạn. Hãy kiểm tra lại thông tin và gửi lại hồ sơ.
            </p>
            <button
              onClick={() => setShowRejectionModal(false)}
              style={{ marginTop: "20px", backgroundColor: "#2563eb", color: "white", border: "none", padding: "12px 24px", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" }}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}