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

const [currentPackage, setCurrentPackage] = useState("FREE");
const [showPaymentModal, setShowPaymentModal] = useState(false);
const [selectedPackageToBuy, setSelectedPackageToBuy] = useState(null);
const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("VNPAY");
const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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

    const payload = {
      storeName: storeInfo.storeName,
      phone: storeInfo.phone,
      address: storeInfo.address,
      description: storeInfo.description,
      openTime: storeInfo.openTime,
      closeTime: storeInfo.closeTime,
      userId: userData.id,
      latitude: storeLocation.lat,
      longitude: storeLocation.lng,
    };

    try {
      const response = await fetch("http://localhost:5000/api/stores/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        alert("✅ Đã gửi yêu cầu đến Admin - Vui lòng chờ Admin duyệt!");
        localStorage.removeItem(`rejection_shown_${userData.id}`);
        setStoreInfo((prev) => ({ ...prev, userId: userData.id }));
        setStoreStatus("pending");
      } else {
        alert("❌ Lỗi từ Database: " + (data.error || "Không rõ nguyên nhân"));
      }
    } catch (error) {
      alert("❌ Lỗi mạng: Không thể kết nối đến máy chủ Backend!");
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
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily: "Inter, sans-serif",
        position: "relative",
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
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      fontWeight: isActive ? "700" : "500",
                      color: isActive ? "white" : "#cbd5e1",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "12px",
                      color: isActive ? "#94a3b8" : "#64748b",
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

      <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
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