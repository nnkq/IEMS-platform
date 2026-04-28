import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Home.css";
import { getHomeDashboard, searchHome } from "../api/homeApi";
import {
  acceptQuoteForRequest,
  confirmRepairCompleted,
  createRepairRequest,
  getMyRepairRequests,
  getReviewForRequest,
  rejectQuoteForRequest,
  submitReviewForRequest,
} from "../api/repairApi";
import StoreChatPanel from "../components/StoreChatPanel";
import { createOrGetConversationByRequest } from "../api/chatApi";

const pageMeta = {
  home: {
    title: "Trang chủ",
    subtitle: "Tổng quan nhanh",
  },
  request: {
    title: "Yêu cầu sửa chữa",
    subtitle: "Tạo yêu cầu sửa chữa với thông tin rõ ràng và đầy đủ.",
  },
  stores: {
    title: "Cửa hàng",
    subtitle: "So sánh cửa hàng theo uy tín, dịch vụ và vị trí.",
  },
  tracking: {
    title: "Theo dõi",
    subtitle: "Theo dõi tiến độ xử lý và các phản hồi mới nhất.",
  },
  chatbot: {
    title: "Trợ lý AI",
    subtitle: "Nhận gợi ý ban đầu trước khi gửi yêu cầu sửa chữa.",
  },
  profile: {
    title: "Hồ sơ",
    subtitle: "Quản lý tài khoản và thông tin cá nhân.",
  },
};

const navItems = [
  { key: "home", icon: "⌂", title: "Trang chủ", subtitle: "Tổng quan nhanh" },
  { key: "request", icon: "✎", title: "Yêu cầu sửa chữa", subtitle: "Tạo yêu cầu mới" },
  { key: "stores", icon: "⌘", title: "Cửa hàng", subtitle: "So sánh và lựa chọn" },
  { key: "tracking", icon: "◔", title: "Theo dõi", subtitle: "Tiến độ và báo giá" },
  { key: "chatbot", icon: "✦", title: "Trợ lý AI", subtitle: "Hỗ trợ ban đầu" },
  { key: "profile", icon: "☺", title: "Hồ sơ", subtitle: "Tài khoản cá nhân" },
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
      return "Đang sửa chữa";
    case "WAITING_STORE_CONFIRM":
      return "Kỹ thuật viên đã hoàn tất · chờ cửa hàng xác nhận";
    case "WAITING_CUSTOMER_CONFIRM":
      return "Cửa hàng đã báo hoàn tất · chờ bạn xác nhận";
    case "COMPLETED":
      return "Hoàn thành";
    case "CANCELLED":
      return "Đã hủy";
    case "ACCEPTED":
      return "Đã chấp nhận";
    case "REJECTED":
      return "Đã từ chối";
    default:
      return status || "Không rõ";
  }
}

function statusClass(status) {
  if (status === "IN_PROGRESS" || status === "WAITING_STORE_CONFIRM" || status === "WAITING_CUSTOMER_CONFIRM") return "status-warning";
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

  return "Tôi đã ghi nhận mô tả của bạn. Bạn có thể tạo yêu cầu sửa chữa để cửa hàng kiểm tra chi tiết và báo giá phù hợp.";
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

const USER_LOCATION_CACHE_KEY = "iems_user_location_cache";
const USER_LOCATION_CACHE_TTL = 10 * 60 * 1000;
const NEARBY_STORES_CACHE_KEY = "iems_nearby_stores_cache";
const NEARBY_STORES_CACHE_TTL = 5 * 60 * 1000;
const NEARBY_STORES_CACHE_DISTANCE_METERS = 200;
const DEFAULT_NEARBY_RADIUS_KM = 20;
const IP_LOCATION_TIMEOUT_MS = 8000;
const DEFAULT_MAP_CENTER = { lat: 16.0544, lng: 108.2022 };
const DANANG_MAP_BOUNDS = {
  south: 15.97,
  west: 108.06,
  north: 16.20,
  east: 108.31,
};
const LEAFLET_ASSET_KEY = "__iemsLeafletAssetLoader__";

function normalizeCoordinate(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function hasValidCoordinates(location = {}) {
  return (
    Number.isFinite(Number(location?.lat)) && Number.isFinite(Number(location?.lng))
  );
}

function isWithinDanang(lat, lng) {
  const nextLat = Number(lat);
  const nextLng = Number(lng);

  return (
    Number.isFinite(nextLat) &&
    Number.isFinite(nextLng) &&
    nextLat >= DANANG_MAP_BOUNDS.south &&
    nextLat <= DANANG_MAP_BOUNDS.north &&
    nextLng >= DANANG_MAP_BOUNDS.west &&
    nextLng <= DANANG_MAP_BOUNDS.east
  );
}

function getDanangLeafletBounds() {
  return [
    [DANANG_MAP_BOUNDS.south, DANANG_MAP_BOUNDS.west],
    [DANANG_MAP_BOUNDS.north, DANANG_MAP_BOUNDS.east],
  ];
}

function formatDanangSearchQuery(text) {
  const normalizedText = String(text || "").trim();
  return normalizedText
    ? `${normalizedText}, Đà Nẵng, Việt Nam`
    : "Đà Nẵng, Việt Nam";
}

function calculateDistanceMeters(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const startLat = toRad(lat1);
  const endLat = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(startLat) *
      Math.cos(endLat) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function readCachedUserLocation() {
  try {
    const raw = localStorage.getItem(USER_LOCATION_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const lat = normalizeCoordinate(parsed?.lat);
    const lng = normalizeCoordinate(parsed?.lng);
    const timestamp = Number(parsed?.timestamp || 0);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !timestamp) {
      localStorage.removeItem(USER_LOCATION_CACHE_KEY);
      return null;
    }

    if (!isWithinDanang(lat, lng)) {
      localStorage.removeItem(USER_LOCATION_CACHE_KEY);
      return null;
    }

    if (Date.now() - timestamp > USER_LOCATION_CACHE_TTL) {
      localStorage.removeItem(USER_LOCATION_CACHE_KEY);
      return null;
    }

    return {
      ...parsed,
      lat,
      lng,
      timestamp,
    };
  } catch (error) {
    console.error("Lỗi đọc cache vị trí:", error);
    localStorage.removeItem(USER_LOCATION_CACHE_KEY);
    return null;
  }
}

function saveCachedUserLocation(payload = {}) {
  const lat = normalizeCoordinate(payload?.lat);
  const lng = normalizeCoordinate(payload?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isWithinDanang(lat, lng)) {
    return;
  }

  localStorage.setItem(
    USER_LOCATION_CACHE_KEY,
    JSON.stringify({
      ...payload,
      lat,
      lng,
      timestamp: Date.now(),
    })
  );
}

function readCachedNearbyStores() {
  try {
    const raw = localStorage.getItem(NEARBY_STORES_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const lat = normalizeCoordinate(parsed?.lat);
    const lng = normalizeCoordinate(parsed?.lng);
    const radiusKm = Number(parsed?.radiusKm || DEFAULT_NEARBY_RADIUS_KM);
    const timestamp = Number(parsed?.timestamp || 0);
    const stores = Array.isArray(parsed?.stores) ? parsed.stores : [];

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !timestamp) {
      localStorage.removeItem(NEARBY_STORES_CACHE_KEY);
      return null;
    }

    if (!isWithinDanang(lat, lng)) {
      localStorage.removeItem(NEARBY_STORES_CACHE_KEY);
      return null;
    }

    if (Date.now() - timestamp > NEARBY_STORES_CACHE_TTL) {
      localStorage.removeItem(NEARBY_STORES_CACHE_KEY);
      return null;
    }

    return {
      lat,
      lng,
      radiusKm,
      stores,
      timestamp,
    };
  } catch (error) {
    console.error("Lỗi đọc cache cửa hàng gần:", error);
    localStorage.removeItem(NEARBY_STORES_CACHE_KEY);
    return null;
  }
}

function saveCachedNearbyStores(payload = {}) {
  const lat = normalizeCoordinate(payload?.lat);
  const lng = normalizeCoordinate(payload?.lng);
  const radiusKm = Number(payload?.radiusKm || DEFAULT_NEARBY_RADIUS_KM);
  const stores = Array.isArray(payload?.stores) ? payload.stores : [];

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  localStorage.setItem(
    NEARBY_STORES_CACHE_KEY,
    JSON.stringify({
      lat,
      lng,
      radiusKm,
      stores,
      timestamp: Date.now(),
    })
  );
}

function getReusableNearbyStoresCache(location, radiusKm = DEFAULT_NEARBY_RADIUS_KM) {
  const cached = readCachedNearbyStores();

  if (!cached || !hasValidCoordinates(location)) {
    return null;
  }

  if (Number(cached.radiusKm) !== Number(radiusKm)) {
    return null;
  }

  const distance = calculateDistanceMeters(
    Number(location.lat),
    Number(location.lng),
    cached.lat,
    cached.lng
  );

  if (distance > NEARBY_STORES_CACHE_DISTANCE_METERS) {
    return null;
  }

  return cached;
}

function requestBrowserLocation(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function pickFirstAddressPart(...values) {
  return values.find((value) => String(value || "").trim()) || "";
}

async function reverseGeocodeLocation(lat, lng) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);

  try {
    const params = new URLSearchParams({
      format: "jsonv2",
      lat: String(lat),
      lon: String(lng),
      zoom: "18",
      addressdetails: "1",
      "accept-language": "vi",
    });

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      throw new Error("Không thể chuyển tọa độ GPS thành địa chỉ chi tiết.");
    }

    const data = await res.json();
    const detail = data?.address || {};

    const houseNumber = pickFirstAddressPart(detail.house_number, detail.house_name);
    const road = pickFirstAddressPart(
      detail.road,
      detail.pedestrian,
      detail.residential,
      detail.footway,
      detail.path
    );
    const ward = pickFirstAddressPart(
      detail.suburb,
      detail.quarter,
      detail.neighbourhood,
      detail.city_district
    );
    const district = pickFirstAddressPart(
      detail.county,
      detail.state_district,
      detail.municipality
    );
    const city = pickFirstAddressPart(detail.city, detail.town, detail.state, "Đà Nẵng");
    const countryName = pickFirstAddressPart(detail.country, "Việt Nam");

    const firstLine = [houseNumber, road].filter(Boolean).join(" ").trim();
    const addressText = [
      firstLine || road,
      ward,
      district && district !== city ? district : "",
      city,
    ]
      .filter(Boolean)
      .join(", ");

    return {
      addressText: addressText || data?.display_name || `${lat}, ${lng}`,
      locality: ward || district || city,
      principalSubdivision: city,
      countryName,
      houseNumber,
      road,
      ward,
      district,
      city,
      displayName: data?.display_name || "",
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchIpApproximateLocation() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), IP_LOCATION_TIMEOUT_MS);

  try {
    const res = await fetch("https://ipwho.is/", {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    const data = await res.json();

    if (!res.ok || data?.success === false) {
      throw new Error(data?.message || "Không thể suy ra vị trí gần đúng từ mạng hiện tại.");
    }

    const lat = normalizeCoordinate(data?.latitude);
    const lng = normalizeCoordinate(data?.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error("Không nhận được tọa độ hợp lệ từ vị trí mạng.");
    }

    if (!isWithinDanang(lat, lng)) {
      throw new Error("Vị trí mạng hiện tại không nằm trong khu vực Đà Nẵng.");
    }

    const locality = data?.city || data?.district || "";
    const principalSubdivision = data?.region || data?.region_code || "";
    const countryName = data?.country || "Việt Nam";
    const addressText = [locality, principalSubdivision, countryName]
      .filter(Boolean)
      .join(", ");

    return {
      lat,
      lng,
      addressText: addressText || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      locality,
      principalSubdivision,
      countryName,
      source: "ip",
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function loadLeafletAssets() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Leaflet chỉ chạy trên trình duyệt."));
  }

  if (window.L) {
    return Promise.resolve(window.L);
  }

  if (window[LEAFLET_ASSET_KEY]) {
    return window[LEAFLET_ASSET_KEY];
  }

  const cssId = "iems-leaflet-css";
  const scriptId = "iems-leaflet-js";

  if (!document.getElementById(cssId)) {
    const link = document.createElement("link");
    link.id = cssId;
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);
  }

  window[LEAFLET_ASSET_KEY] = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(scriptId);

    const handleLoad = () => {
      if (window.L) {
        resolve(window.L);
      } else {
        reject(new Error("Không thể khởi tạo thư viện bản đồ."));
      }
    };

    const handleError = () => {
      reject(new Error("Không tải được thư viện bản đồ. Vui lòng kiểm tra kết nối internet."));
    };

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    script.crossOrigin = "";
    script.async = true;
    script.onload = handleLoad;
    script.onerror = handleError;
    document.body.appendChild(script);
  }).catch((error) => {
    delete window[LEAFLET_ASSET_KEY];
    throw error;
  });

  return window[LEAFLET_ASSET_KEY];
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
  const [storeFilter, setStoreFilter] = useState("all");
  const [nearbyStores, setNearbyStores] = useState([]);
  const [nearbyStoresLoading, setNearbyStoresLoading] = useState(false);

  const [activePage, setActivePage] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationItems, setNotificationItems] = useState([]);
  const [notificationActionLoading, setNotificationActionLoading] = useState(false);
  const [pendingTrackedRequestId, setPendingTrackedRequestId] = useState(null);
  const notificationRef = useRef(null);

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
  const [locationMeta, setLocationMeta] = useState({
    source: "",
    accuracy: null,
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
      title: "Trợ lý IEMS",
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
      title: "Trợ lý IEMS",
      time: "08:31",
      text: "Tình trạng này thường liên quan đến màn hình OLED hoặc cáp kết nối bị lỏng sau va đập. Bạn nên sao lưu dữ liệu và tránh tiếp tục đè nén màn hình trước khi mang đi kiểm tra.",
    },
  ]);

  const [imageFile, setImageFile] = useState("");
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const searchTimeout = useRef(null);
  const addressSearchAbortRef = useRef(null);
  const nearbyStoresAbortRef = useRef(null);
  const mapPickerContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const leafletMarkerRef = useRef(null);
  const inlineMapContainerRef = useRef(null);
  const inlineLeafletMapRef = useRef(null);
  const inlineLeafletMarkerRef = useRef(null);
  const userLocationRef = useRef({ lat: null, lng: null });
  const mapPickerDraftRef = useRef({ lat: null, lng: null });
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapPickerSaving, setMapPickerSaving] = useState(false);
  const [mapPickerStatus, setMapPickerStatus] = useState("");
  const [inlineMapStatus, setInlineMapStatus] = useState("Bản đồ ghim vị trí chỉ hỗ trợ khu vực Đà Nẵng.");
  const [mapPickerDraft, setMapPickerDraft] = useState({ lat: null, lng: null });

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

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
          error.response?.data?.message || "Không thể tải dữ liệu trang chủ"
        );
      } finally {
        setDashboardLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  useEffect(() => {
    const cachedLocation = readCachedUserLocation();

    if (cachedLocation) {
      setUserLocation({
        lat: cachedLocation.lat,
        lng: cachedLocation.lng,
      });
      setLocationMeta({
        source: cachedLocation.source || "gps",
        accuracy: Number.isFinite(Number(cachedLocation.accuracy))
          ? Number(cachedLocation.accuracy)
          : null,
      });
      setAddress((prev) => prev || cachedLocation.address || `${cachedLocation.lat}, ${cachedLocation.lng}`);
    }
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
        setSearchError(error.response?.data?.message || "Không thể tìm kiếm");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
      addressSearchAbortRef.current?.abort();
      nearbyStoresAbortRef.current?.abort();
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
      leafletMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapPickerOpen) {
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
      leafletMarkerRef.current = null;
    }
  }, [mapPickerOpen]);

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
    if (!pendingTrackedRequestId || !Array.isArray(trackingRequests) || !trackingRequests.length) {
      return;
    }

    const matched = trackingRequests.find(
      (item) => Number(item.id) === Number(pendingTrackedRequestId)
    );

    if (matched) {
      setSelectedTrackedRequest(matched);
      setPendingTrackedRequestId(null);
    }
  }, [pendingTrackedRequestId, trackingRequests]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const counters = dashboardData?.counters || {};
  const unreadCount = Number(counters.unreadNotifications || 0);
  const recentRequests = dashboardData?.recentRequests || [];
  const pendingQuotes = dashboardData?.pendingQuotes || [];
  const savedDevices = dashboardData?.savedDevices || [];
  const verifiedStores = dashboardData?.verifiedStores || [];
  const trustedStores = useMemo(
    () =>
      verifiedStores.filter(
        (store) =>
          Number(store?.is_trusted_store) === 1 ||
          store?.is_trusted_store === true ||
          Number(store?.has_verified_badge) === 1 ||
          store?.has_verified_badge === true
      ),
    [verifiedStores]
  );
  const displayedStores = storeFilter === "trusted" ? trustedStores : verifiedStores;
  const user = dashboardData?.user || {};
  const header = dashboardData?.header || {};

  const hasVerifiedBadge = (store) =>
    Number(store?.has_verified_badge) === 1 ||
    store?.has_verified_badge === true ||
    Number(store?.is_trusted_store) === 1 ||
    store?.is_trusted_store === true;

  const getStorePackageLabel = (store) => {
    if (store?.package_name === "PREMIUM") return "Đối tác chiến lược";
    if (store?.package_name === "VERIFIED") return "Cửa hàng uy tín";
    return "Đã xác minh";
  };

  const renderVerifiedBadge = (store, compact = false) => {
    if (!hasVerifiedBadge(store)) return null;

    return (
      <span className={`verified-badge${compact ? " compact" : ""}`}>
        <span className="verified-badge-icon">✓</span>
        Đã xác minh
      </span>
    );
  };

  const selectableStores = nearbyStores.length > 0 ? nearbyStores : verifiedStores;

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
    setNotificationOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateUnreadCounter = (value) => {
    setDashboardData((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        counters: {
          ...(prev.counters || {}),
          unreadNotifications: Math.max(0, Number(value || 0)),
        },
      };
    });
  };

  const inferNotificationTarget = (item = {}) => {
    if (item?.targetPage) return item.targetPage;

    const title = String(item?.title || "").toLowerCase();
    const message = String(item?.message || "").toLowerCase();
    const type = String(item?.type || "").toUpperCase();
    const content = `${title} ${message}`;

    if (
      type === "QUOTE" ||
      type === "ORDER" ||
      type === "PAYMENT" ||
      content.includes("báo giá") ||
      content.includes("hoàn thành") ||
      content.includes("xác nhận") ||
      content.includes("sửa chữa") ||
      content.includes("theo dõi") ||
      content.includes("đơn") ||
      content.includes("#rq-")
    ) {
      return "tracking";
    }

    if (
      content.includes("ưu đãi") ||
      content.includes("khuyến mãi") ||
      content.includes("giảm giá") ||
      content.includes("voucher") ||
      content.includes("cửa hàng")
    ) {
      return "stores";
    }

    if (content.includes("ai") || content.includes("chẩn đoán")) {
      return "chatbot";
    }

    return "home";
  };

  const extractRelatedRequestId = (item = {}) => {
    if (item?.relatedRequestId) return Number(item.relatedRequestId);

    const rawText = `${item?.title || ""} ${item?.message || ""}`;
    const match = rawText.match(/#RQ-(\d+)/i);
    return match ? Number(match[1]) : null;
  };

  const markNotificationAsRead = async (notificationId) => {
    const token = localStorage.getItem("token");
    if (!token || !notificationId) return null;

    const res = await fetch(
      `http://localhost:5000/api/users/notifications/${notificationId}/read`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Không thể cập nhật trạng thái thông báo");
    }

    return data;
  };

  const trackNotificationClick = async (notificationId) => {
    const token = localStorage.getItem("token");
    if (!token || !notificationId) return null;

    const res = await fetch(
      `http://localhost:5000/api/users/notifications/${notificationId}/click`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Không thể ghi nhận click thông báo");
    }

    return data;
  };

  const markAllNotificationsAsRead = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setNotificationActionLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/users/notifications/read-all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Không thể cập nhật tất cả thông báo");
      }

      setNotificationItems((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
          is_read: 1,
          status: "READ",
        }))
      );
      updateUnreadCounter(data.unreadNotifications || 0);
    } catch (error) {
      console.error("Lỗi đánh dấu xem tất cả thông báo:", error);
      alert(error.message || "Không thể cập nhật tất cả thông báo");
    } finally {
      setNotificationActionLoading(false);
    }
  };

  const handleNotificationClick = async (item) => {
    try {
      if (!item?.id) return;

      setNotificationActionLoading(true);

      const result = await markNotificationAsRead(item.id);

      setNotificationItems((prev) =>
        prev.map((notification) =>
          notification.id === item.id
            ? {
                ...notification,
                isRead: true,
                is_read: 1,
                status: "READ",
              }
            : notification
        )
      );

      updateUnreadCounter(result?.unreadNotifications || 0);
      await trackNotificationClick(item.id);

      const relatedRequestId = extractRelatedRequestId(item);
      const targetPage = inferNotificationTarget(item);

      setNotificationOpen(false);
      openPage(targetPage);

      if (targetPage === "tracking" && relatedRequestId) {
        setPendingTrackedRequestId(relatedRequestId);
      }
    } catch (error) {
      console.error("Lỗi mở thông báo:", error);
      alert(error.message || "Không thể mở thông báo");
    } finally {
      setNotificationActionLoading(false);
    }
  };

  const loadNotificationPreview = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setNotificationLoading(true);

      const res = await fetch("http://localhost:5000/api/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Không tải được thông báo");
      }

      setNotificationItems(
        Array.isArray(data.recentNotifications) ? data.recentNotifications.slice(0, 5) : []
      );
    } catch (error) {
      console.error("Lỗi tải thông báo:", error);
      setNotificationItems([]);
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    const nextOpen = !notificationOpen;
    setNotificationOpen(nextOpen);

    if (nextOpen) {
      await loadNotificationPreview();
    }
  };

  const formatNotificationTime = (value) => {
    if (!value) return "Chưa có thời gian";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("vi-VN");
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
      { role: "ai", title: "Trợ lý IEMS", time: "Bây giờ", text: getAiReply(clean) },
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
        throw new Error(data.message || "Không thể cập nhật hồ sơ");
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
      setProfileMessage(error.message || "Không thể cập nhật hồ sơ");
    } finally {
      setProfileSaving(false);
    }
  };

  function syncInlineMapPreview({ lat, lng, zoom = 16, status = "" }) {
    const nextLat = normalizeCoordinate(lat);
    const nextLng = normalizeCoordinate(lng);

    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng) || !isWithinDanang(nextLat, nextLng)) {
      return;
    }

    mapPickerDraftRef.current = { lat: nextLat, lng: nextLng };
    setMapPickerDraft({ lat: nextLat, lng: nextLng });

    if (inlineLeafletMarkerRef.current) {
      inlineLeafletMarkerRef.current.setLatLng([nextLat, nextLng]);
    }

    if (inlineLeafletMapRef.current) {
      const nextZoom = Number.isFinite(Number(zoom))
        ? Number(zoom)
        : inlineLeafletMapRef.current.getZoom();
      inlineLeafletMapRef.current.setView([nextLat, nextLng], nextZoom, { animate: true });
    }

    if (status) {
      setInlineMapStatus(status);
    }
  }

  const applyLocationSelection = ({
    lat,
    lng,
    addressText,
    locality = "",
    principalSubdivision = "",
    countryName = "Việt Nam",
    source = "gps",
    accuracy = null,
  }) => {
    const nextLat = normalizeCoordinate(lat);
    const nextLng = normalizeCoordinate(lng);

    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
      throw new Error("Không nhận được tọa độ hợp lệ để lưu vị trí.");
    }

    if (!isWithinDanang(nextLat, nextLng)) {
      alert("Hệ thống hiện chỉ hỗ trợ ghim và tìm vị trí trong khu vực Đà Nẵng.");
      return false;
    }

    const nextAddress = addressText || `${nextLat.toFixed(6)}, ${nextLng.toFixed(6)}`;

    setUserLocation({ lat: nextLat, lng: nextLng });
    setNearbyStores([]);
    setAddress(nextAddress);
    setLocationMeta({
      source,
      accuracy: Number.isFinite(Number(accuracy)) ? Number(accuracy) : null,
    });

    saveCachedUserLocation({
      lat: nextLat,
      lng: nextLng,
      address: nextAddress,
      locality,
      principalSubdivision,
      countryName,
      source,
      accuracy: Number.isFinite(Number(accuracy)) ? Number(accuracy) : null,
    });

    syncInlineMapPreview({
      lat: nextLat,
      lng: nextLng,
      zoom: 16,
      status: "Đã đồng bộ bản đồ theo vị trí tại Đà Nẵng. Bạn có thể kéo ghim để chốt chính xác hơn.",
    });

    return true;
  };

  const openMapPicker = () => {
    const cachedLocation = readCachedUserLocation();

    const seedLat = hasValidCoordinates(userLocation)
      ? Number(userLocation.lat)
      : cachedLocation?.lat ?? DEFAULT_MAP_CENTER.lat;
    const seedLng = hasValidCoordinates(userLocation)
      ? Number(userLocation.lng)
      : cachedLocation?.lng ?? DEFAULT_MAP_CENTER.lng;

    syncInlineMapPreview({
      lat: seedLat,
      lng: seedLng,
      zoom: hasValidCoordinates(userLocation) || cachedLocation ? 16 : 13,
      status:
        hasValidCoordinates(userLocation) || cachedLocation
          ? "Bạn có thể click lên bản đồ hoặc kéo ghim để chốt vị trí chính xác hơn trong Đà Nẵng."
          : "Chưa có vị trí sẵn. Hãy click vào bản đồ Đà Nẵng để ghim vị trí của bạn.",
    });

    if (hasValidCoordinates(userLocation) || cachedLocation) {
      setMapPickerStatus(
        "Bạn có thể click lên bản đồ hoặc kéo ghim để chốt vị trí chính xác hơn."
      );
    } else {
      setMapPickerStatus(
        "Chưa có vị trí sẵn. Hãy click vào bản đồ để ghim vị trí của bạn chính xác nhất."
      );
    }

    setMapPickerOpen(true);
  };

  const locationSourceLabel =
    locationMeta.source === "map"
      ? "Đã ghim chính xác trên bản đồ"
      : locationMeta.source === "search"
      ? "Đã chọn từ gợi ý địa chỉ"
      : locationMeta.source === "ip"
      ? "Đang dùng vị trí gần đúng theo mạng"
      : locationMeta.source === "gps"
      ? "Đang dùng GPS"
      : "";

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
    setLocationMeta({ source: "", accuracy: null });
    setAddressSuggestions([]);
    setShowAddressDropdown(false);
    mapPickerDraftRef.current = { lat: null, lng: null };
    setMapPickerDraft({ lat: null, lng: null });
    setMapPickerStatus("");
  };

  const getCurrentLocation = async ({ forceRefresh = true } = {}) => {
    if (loadingLocation) return;

    if (!forceRefresh) {
      const cachedLocation = readCachedUserLocation();

      if (cachedLocation && cachedLocation.source === "gps") {
        setUserLocation({
          lat: cachedLocation.lat,
          lng: cachedLocation.lng,
        });
        setAddress(cachedLocation.address || `${cachedLocation.lat}, ${cachedLocation.lng}`);
        setLocationMeta({
          source: "gps",
          accuracy: Number.isFinite(Number(cachedLocation.accuracy))
            ? Number(cachedLocation.accuracy)
            : null,
        });
        setNearbyStores([]);
        alert("Đã dùng lại vị trí GPS đã lưu gần nhất.");
        return;
      }
    }

    setLoadingLocation(true);

    try {
      if (!navigator.geolocation) {
        throw new Error("Trình duyệt không hỗ trợ định vị GPS.");
      }

      const pos = await requestBrowserLocation({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });

      const lat = normalizeCoordinate(pos?.coords?.latitude);
      const lng = normalizeCoordinate(pos?.coords?.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error("Không lấy được tọa độ GPS hợp lệ.");
      }

      const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      let resolvedLocation = {
        addressText: fallbackAddress,
        locality: "",
        principalSubdivision: "",
        countryName: "Việt Nam",
      };

      try {
        resolvedLocation = await reverseGeocodeLocation(lat, lng);
      } catch (error) {
        console.error("Lỗi reverse geocode:", error);
      }

      applyLocationSelection({
        lat,
        lng,
        addressText: resolvedLocation.addressText || fallbackAddress,
        locality: resolvedLocation.locality,
        principalSubdivision: resolvedLocation.principalSubdivision,
        countryName: resolvedLocation.countryName,
        source: "gps",
        accuracy: Number(pos?.coords?.accuracy),
      });

      const accuracy = Number(pos?.coords?.accuracy);
      const accuracyText = Number.isFinite(accuracy)
        ? ` Sai số khoảng ${Math.round(accuracy)}m.`
        : "";

      alert(`Đã lấy GPS chính xác cao thành công. Địa chỉ gần đúng đã được điền tự động.${accuracyText}`);
    } catch (err) {
      console.error("GPS error:", err);

      if (err?.code === 1) {
        alert("Bạn đã từ chối quyền truy cập vị trí. Hãy nhập địa chỉ thủ công hoặc cho phép GPS rồi thử lại.");
      } else if (err?.code === 2) {
        alert("Không xác định được vị trí GPS hiện tại. Bạn có thể nhập địa chỉ thủ công để tiếp tục.");
      } else if (err?.code === 3) {
        alert("Lấy GPS quá lâu. Vui lòng thử lại ở nơi có sóng tốt hơn hoặc nhập địa chỉ thủ công.");
      } else {
        alert(err?.message || "Có lỗi khi lấy vị trí GPS.");
      }
    } finally {
      setLoadingLocation(false);
    }
  };

  const fetchNearbyStores = async () => {
    let nextLocation = userLocation;

    if (!hasValidCoordinates(nextLocation)) {
      const cachedLocation = readCachedUserLocation();

      if (cachedLocation) {
        nextLocation = {
          lat: cachedLocation.lat,
          lng: cachedLocation.lng,
        };
        setUserLocation(nextLocation);
        setLocationMeta({
          source: cachedLocation.source || "gps",
          accuracy: Number.isFinite(Number(cachedLocation.accuracy))
            ? Number(cachedLocation.accuracy)
            : null,
        });
        if (!address) {
          setAddress(cachedLocation.address || `${cachedLocation.lat}, ${cachedLocation.lng}`);
        }
      }
    }

    if (!hasValidCoordinates(nextLocation)) {
      alert("Vui lòng nhập/chọn địa chỉ hợp lệ hoặc lấy GPS trước khi tìm cửa hàng gần.");
      return;
    }

    const radiusKm = DEFAULT_NEARBY_RADIUS_KM;
    const reusableCache = getReusableNearbyStoresCache(nextLocation, radiusKm);

    if (reusableCache) {
      setNearbyStores(reusableCache.stores);

      if (!reusableCache.stores.length) {
        alert("Đã dùng lại kết quả gần nhất. Hiện chưa có cửa hàng phù hợp quanh vị trí này.");
        return;
      }

      setIsModalOpen(true);
      return;
    }

    const controller = new AbortController();

    try {
      setNearbyStoresLoading(true);
      nearbyStoresAbortRef.current?.abort();
      nearbyStoresAbortRef.current = controller;

      const res = await fetch("http://localhost:5000/api/map/stores/nearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          ...nextLocation,
          radiusKm,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Không thể tải danh sách cửa hàng gần");
      }

      const stores = Array.isArray(data) ? data : [];
      setNearbyStores(stores);
      saveCachedNearbyStores({
        lat: nextLocation.lat,
        lng: nextLocation.lng,
        radiusKm,
        stores,
      });

      if (!stores.length) {
        alert("Không tìm thấy cửa hàng phù hợp gần vị trí của bạn.");
        return;
      }

      setIsModalOpen(true);
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      console.error("Lỗi lấy cửa hàng gần:", error);
      alert(error.message || "Không thể tải cửa hàng gần");
    } finally {
      if (nearbyStoresAbortRef.current === controller) {
        nearbyStoresAbortRef.current = null;
        setNearbyStoresLoading(false);
      }
    }
  };

  const searchAddress = (text) => {
    const normalizedText = text.trim();

    setAddress(text);
    setNearbyStores([]);
    setUserLocation({ lat: null, lng: null });
    setLocationMeta({ source: "", accuracy: null });

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    addressSearchAbortRef.current?.abort();

    if (normalizedText.length < 3) {
      setAddressSuggestions([]);
      setShowAddressDropdown(false);
      setIsSearchingAddress(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearchingAddress(true);
      const controller = new AbortController();
      addressSearchAbortRef.current = controller;

      try {
        const params = new URLSearchParams({
          format: "json",
          q: formatDanangSearchQuery(normalizedText),
          limit: "5",
          addressdetails: "1",
          countrycodes: "vn",
          "accept-language": "vi",
          bounded: "1",
          viewbox: `${DANANG_MAP_BOUNDS.west},${DANANG_MAP_BOUNDS.north},${DANANG_MAP_BOUNDS.east},${DANANG_MAP_BOUNDS.south}`,
        });

        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });
        const data = await res.json();

        if (controller.signal.aborted) {
          return;
        }

        const uniqueSuggestions = Array.isArray(data)
          ? data
              .filter((item, index, arr) =>
                index ===
                arr.findIndex(
                  (candidate) =>
                    candidate.lat === item.lat && candidate.lon === item.lon
                )
              )
              .filter((item) => isWithinDanang(item?.lat, item?.lon))
          : [];

        setAddressSuggestions(uniqueSuggestions);
        setShowAddressDropdown(uniqueSuggestions.length > 0);

        if (uniqueSuggestions.length > 0) {
          const previewLat = normalizeCoordinate(uniqueSuggestions[0]?.lat);
          const previewLng = normalizeCoordinate(uniqueSuggestions[0]?.lon);

          syncInlineMapPreview({
            lat: previewLat,
            lng: previewLng,
            zoom: 16,
            status: "Bản đồ đã nhảy tới gợi ý đầu tiên trong Đà Nẵng. Bạn có thể kéo ghim để chốt vị trí chính xác.",
          });
        } else {
          setInlineMapStatus("Không tìm thấy địa chỉ phù hợp trong khu vực Đà Nẵng.");
        }
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Lỗi tìm địa chỉ:", error);
        setAddressSuggestions([]);
        setShowAddressDropdown(false);
      } finally {
        if (!controller.signal.aborted) {
          setIsSearchingAddress(false);
        }
      }
    }, 500);
  };

  const handleSelectAddress = (item) => {
    const lat = normalizeCoordinate(item?.lat);
    const lng = normalizeCoordinate(item?.lon);
    const nextAddress = item?.display_name || "";

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    addressSearchAbortRef.current?.abort();
    setIsSearchingAddress(false);
    setShowAddressDropdown(false);

    applyLocationSelection({
      lat,
      lng,
      addressText: nextAddress,
      locality:
        item?.address?.city ||
        item?.address?.town ||
        item?.address?.village ||
        item?.address?.suburb ||
        "",
      principalSubdivision:
        item?.address?.state ||
        item?.address?.city_district ||
        item?.address?.county ||
        "",
      countryName: item?.address?.country || "Việt Nam",
      source: "search",
    });
  };

  const handleUseTypedAddress = () => {
    const normalizedText = address.trim();

    if (normalizedText.length < 3) {
      alert("Vui lòng nhập địa chỉ rõ hơn trước khi dùng vị trí này.");
      return;
    }

    if (addressSuggestions.length > 0) {
      handleSelectAddress(addressSuggestions[0]);
      return;
    }

    searchAddress(normalizedText);
    alert("Hãy chọn một gợi ý địa chỉ phù hợp để hệ thống xác định đúng tọa độ.");
  };

  const handleConfirmMapPicker = async () => {
    if (!hasValidCoordinates(mapPickerDraft)) {
      alert("Vui lòng click trên bản đồ hoặc kéo ghim tới đúng vị trí trước khi xác nhận.");
      return;
    }

    setMapPickerSaving(true);
    setMapPickerStatus("Đang xác nhận địa chỉ từ vị trí bạn đã ghim...");

    try {
      const lat = Number(mapPickerDraft.lat);
      const lng = Number(mapPickerDraft.lng);
      let resolvedLocation = {
        addressText: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        locality: "",
        principalSubdivision: "",
        countryName: "Việt Nam",
      };

      try {
        resolvedLocation = await reverseGeocodeLocation(lat, lng);
      } catch (error) {
        console.error("Lỗi reverse geocode khi ghim bản đồ:", error);
      }

      const applied = applyLocationSelection({
        lat,
        lng,
        addressText: resolvedLocation.addressText,
        locality: resolvedLocation.locality,
        principalSubdivision: resolvedLocation.principalSubdivision,
        countryName: resolvedLocation.countryName,
        source: "map",
        accuracy: 5,
      });

      if (!applied) {
        return;
      }

      setMapPickerOpen(false);
      setMapPickerStatus("");
      setInlineMapStatus("Đã lưu vị trí ghim chính xác trong Đà Nẵng.");
      alert("Đã cập nhật vị trí chính xác từ bản đồ.");
    } catch (error) {
      console.error("Lỗi xác nhận vị trí bản đồ:", error);
      setMapPickerStatus(error.message || "Không thể lưu vị trí đã ghim.");
    } finally {
      setMapPickerSaving(false);
    }
  };

  useEffect(() => {
    if (!mapPickerOpen || !mapPickerContainerRef.current) {
      return undefined;
    }

    let cancelled = false;

    const initializeMap = async () => {
      try {
        setMapPickerStatus((prev) =>
          prev || "Đang tải bản đồ..."
        );

        const L = await loadLeafletAssets();
        if (cancelled || !mapPickerContainerRef.current) {
          return;
        }

        const draftLocation = mapPickerDraftRef.current;
        const centerLat = Number.isFinite(Number(draftLocation.lat))
          ? Number(draftLocation.lat)
          : DEFAULT_MAP_CENTER.lat;
        const centerLng = Number.isFinite(Number(draftLocation.lng))
          ? Number(draftLocation.lng)
          : DEFAULT_MAP_CENTER.lng;
        const zoomLevel = hasValidCoordinates(draftLocation) ? 16 : 13;

        const map = L.map(mapPickerContainerRef.current, {
          zoomControl: true,
          attributionControl: true,
          maxBounds: getDanangLeafletBounds(),
          maxBoundsViscosity: 1.0,
          minZoom: 12,
        }).setView([centerLat, centerLng], zoomLevel);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        const marker = L.marker([centerLat, centerLng], { draggable: true }).addTo(map);

        const updateDraft = (lat, lng, nextStatus) => {
          if (!isWithinDanang(lat, lng)) {
            setMapPickerStatus("Bạn chỉ có thể ghim vị trí trong khu vực Đà Nẵng.");
            return;
          }

          mapPickerDraftRef.current = { lat, lng };
          setMapPickerDraft({ lat, lng });
          marker.setLatLng([lat, lng]);
          if (nextStatus) {
            setMapPickerStatus(nextStatus);
          }
        };

        map.on("click", (event) => {
          updateDraft(
            event.latlng.lat,
            event.latlng.lng,
            "Đã cập nhật ghim trên bản đồ. Bạn có thể xác nhận để lưu vị trí này."
          );
        });

        marker.on("dragend", () => {
          const latLng = marker.getLatLng();
          updateDraft(
            latLng.lat,
            latLng.lng,
            "Đã kéo ghim tới vị trí mới. Hãy bấm xác nhận để lưu."
          );
        });

        leafletMapRef.current = map;
        leafletMarkerRef.current = marker;

        window.setTimeout(() => {
          map.invalidateSize();
        }, 50);

        setMapPickerStatus((prev) =>
          prev === "Đang tải bản đồ..."
            ? "Click vào bản đồ hoặc kéo ghim để chọn vị trí chính xác."
            : prev
        );
      } catch (error) {
        console.error("Lỗi khởi tạo bản đồ:", error);
        setMapPickerStatus(
          error.message || "Không thể tải bản đồ. Vui lòng kiểm tra kết nối internet rồi thử lại."
        );
      }
    };

    initializeMap();

    return () => {
      cancelled = true;
    };
  }, [mapPickerOpen]);

  useEffect(() => {
    if (activePage !== "request" || !inlineMapContainerRef.current || inlineLeafletMapRef.current) {
      return undefined;
    }

    let cancelled = false;

    const initializeInlineMap = async () => {
      try {
        setInlineMapStatus((prev) => prev || "Đang tải bản đồ Đà Nẵng...");

        const L = await loadLeafletAssets();
        if (cancelled || !inlineMapContainerRef.current) {
          return;
        }

        const cachedLocation = readCachedUserLocation();
        const currentUserLocation = userLocationRef.current;
        const seedLat = hasValidCoordinates(currentUserLocation)
          ? Number(currentUserLocation.lat)
          : cachedLocation?.lat ?? DEFAULT_MAP_CENTER.lat;
        const seedLng = hasValidCoordinates(currentUserLocation)
          ? Number(currentUserLocation.lng)
          : cachedLocation?.lng ?? DEFAULT_MAP_CENTER.lng;
        const bounds = getDanangLeafletBounds();

        const map = L.map(inlineMapContainerRef.current, {
          zoomControl: true,
          attributionControl: true,
          maxBounds: bounds,
          maxBoundsViscosity: 1.0,
          minZoom: 12,
        }).setView([seedLat, seedLng], hasValidCoordinates(currentUserLocation) || cachedLocation ? 16 : 12);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        const marker = L.marker([seedLat, seedLng], { draggable: true }).addTo(map);

        const updateDraft = (lat, lng, nextStatus) => {
          if (!isWithinDanang(lat, lng)) {
            setInlineMapStatus("Bạn chỉ có thể ghim vị trí trong khu vực Đà Nẵng.");
            return;
          }

          mapPickerDraftRef.current = { lat, lng };
          setMapPickerDraft({ lat, lng });
          marker.setLatLng([lat, lng]);
          if (nextStatus) {
            setInlineMapStatus(nextStatus);
          }
        };

        map.on("click", (event) => {
          updateDraft(
            event.latlng.lat,
            event.latlng.lng,
            "Đã cập nhật ghim trên bản đồ Đà Nẵng. Bấm lưu vị trí để xác nhận."
          );
        });

        marker.on("dragend", () => {
          const latLng = marker.getLatLng();
          updateDraft(
            latLng.lat,
            latLng.lng,
            "Đã kéo ghim tới vị trí mới trong Đà Nẵng. Bấm lưu vị trí để xác nhận."
          );
        });

        inlineLeafletMapRef.current = map;
        inlineLeafletMarkerRef.current = marker;

        mapPickerDraftRef.current = { lat: seedLat, lng: seedLng };
        setMapPickerDraft({ lat: seedLat, lng: seedLng });

        window.setTimeout(() => {
          map.invalidateSize();
        }, 50);

        setInlineMapStatus((prev) =>
          prev === "Đang tải bản đồ Đà Nẵng..."
            ? "Nhập địa chỉ tại Đà Nẵng hoặc click trực tiếp lên bản đồ để ghim vị trí."
            : prev
        );
      } catch (error) {
        console.error("Lỗi khởi tạo bản đồ inline:", error);
        setInlineMapStatus(error.message || "Không thể tải bản đồ Đà Nẵng.");
      }
    };

    initializeInlineMap();

    return () => {
      cancelled = true;
    };
  }, [activePage]);

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
          error.response?.data?.message || "Không thể tải danh sách yêu cầu"
        );
      }
    } finally {
      if (!isBackground) setTrackingLoading(false);
    }
  };

  const handleAcceptQuote = async (requestId) => {
    try {
      const res = await acceptQuoteForRequest(requestId);
      alert(res.data?.message || "Bạn đã chấp nhận báo giá.");
      await loadTrackingRequests();
      if (selectedTrackedRequest?.id === requestId) {
        setSelectedTrackedRequest(null);
      }
    } catch (error) {
      console.error("Lỗi đồng ý báo giá:", error);
      alert(error.response?.data?.message || "Không thể chấp nhận báo giá");
    }
  };

  const handleRejectQuote = async (requestId) => {
    const ok = window.confirm("Bạn có chắc muốn từ chối báo giá này?");
    if (!ok) return;

    try {
      const res = await rejectQuoteForRequest(requestId);
      alert(res.data?.message || "Bạn đã từ chối báo giá.");
      await loadTrackingRequests();
      if (selectedTrackedRequest?.id === requestId) {
        setSelectedTrackedRequest(null);
      }
    } catch (error) {
      console.error("Lỗi từ chối báo giá:", error);
      alert(error.response?.data?.message || "Không thể từ chối báo giá");
    }
  };

  const handleConfirmCompleted = async (requestId) => {
    const ok = window.confirm("Bạn xác nhận cửa hàng đã hoàn thành và đã bàn giao thiết bị cho bạn?");
    if (!ok) return;

    try {
      const res = await confirmRepairCompleted(requestId);
      alert(res.data?.message || "Bạn đã xác nhận hoàn thành.");
      await loadTrackingRequests();
      if (selectedTrackedRequest?.id === requestId) {
        setSelectedTrackedRequest(null);
      }
    } catch (error) {
      console.error("Lỗi xác nhận hoàn thành:", error);
      alert(error.response?.data?.message || "Không thể xác nhận hoàn thành");
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
        alert("Chỉ có thể đánh giá khi đơn đã hoàn thành.");
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
      alert(error.response?.data?.message || "Không thể mở biểu mẫu đánh giá");
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

      alert("Gửi đánh giá thành công!");

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
      alert(error.response?.data?.message || "Không thể gửi đánh giá");
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
      alert("Vui lòng nhập tiêu đề và mô tả lỗi.");
      return;
    }
    if (!hasValidCoordinates(userLocation)) {
      alert("Vui lòng nhập/chọn địa chỉ hợp lệ hoặc dùng GPS chính xác cao.");
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
      alert("Vui lòng nhập tiêu đề và mô tả lỗi trước.");
      openPage("request");
      return;
    }

    if (!hasValidCoordinates(userLocation)) {
      alert("Vui lòng nhập/chọn địa chỉ hợp lệ hoặc dùng GPS chính xác cao trước.");
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

      alert(res.data?.message || "Tạo yêu cầu sửa chữa thành công.");

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

  const totalSearchResults =
    searchResult.repairRequests.length + searchResult.stores.length + searchResult.devices.length;
  const hasSearchText = Boolean(searchText.trim());

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

          <div className="sidebar-account-panel">
            <div className="sidebar-user-strip">
              <button
                type="button"
                className="sidebar-user-main"
                onClick={() => openPage("profile")}
                title="Mở hồ sơ"
              >
                <div className="avatar sidebar-account-avatar">
                  {user.initials || buildInitials(user.name || "U")}
                </div>

                <div className="sidebar-user-copy">
                  <strong>{user.name || "Chưa có dữ liệu"}</strong>
                  <span>
                    <i className="sidebar-status-dot" />
                    Đang hoạt động
                  </span>
                </div>
              </button>

              <button
                type="button"
                className="sidebar-logout-icon"
                onClick={handleLogout}
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M14 17l5-5-5-5" />
                  <path d="M19 12H9" />
                  <path d="M11 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
                </svg>
              </button>
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
                    ? header.subtitle || "Tổng quan nhanh"
                    : pageMeta[activePage].subtitle || ""}
                </p>
              </div>
            </div>

            <div className="topbar-actions">
              <div className="search-wrap">
                <label className="search-shell compact">
                  <span className="search-icon">⌕</span>
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Tìm nhanh..."
                  />
                  {hasSearchText && (
                    <button
                      type="button"
                      className="search-clear"
                      onClick={(e) => {
                        e.preventDefault();
                        setSearchText("");
                        setSearchError("");
                      }}
                      aria-label="Xóa tìm kiếm"
                    >
                      ×
                    </button>
                  )}
                </label>

                {hasSearchText && (
                  <div className="search-popover">
                    <div className="search-popover-head">
                      <strong>{totalSearchResults} kết quả</strong>
                      <span>{searchText}</span>
                    </div>

                    {searchError ? (
                      <div className="search-empty compact">{searchError}</div>
                    ) : totalSearchResults === 0 ? (
                      <div className="search-empty compact">Không tìm thấy kết quả phù hợp.</div>
                    ) : (
                      <div className="search-list-compact">
                        {searchResult.repairRequests.slice(0, 3).map((item) => (
                          <button
                            key={`req-${item.id}`}
                            type="button"
                            className="search-hit"
                            onClick={() => {
                              openPage("tracking");
                              setSearchText("");
                            }}
                          >
                            <span className="search-hit-type">Yêu cầu</span>
                            <strong>{item.title}</strong>
                            <small>{item.device_name || statusLabel(item.status)}</small>
                          </button>
                        ))}

                        {searchResult.stores.slice(0, 3).map((item) => (
                          <button
                            key={`store-${item.id}`}
                            type="button"
                            className="search-hit"
                            onClick={() => {
                              openPage("stores");
                              setSearchText("");
                            }}
                          >
                            <span className="search-hit-type">Cửa hàng</span>
                            <strong>{item.store_name}</strong>
                            <small>{item.address || "Chưa có địa chỉ"}</small>
                          </button>
                        ))}

                        {searchResult.devices.slice(0, 3).map((item) => (
                          <button
                            key={`device-${item.id}`}
                            type="button"
                            className="search-hit"
                            onClick={() => {
                              openPage("request");
                              setSearchText("");
                            }}
                          >
                            <span className="search-hit-type">Thiết bị</span>
                            <strong>{item.name}</strong>
                            <small>{item.category || "Thiết bị"}</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="notification-menu" ref={notificationRef}>
                <button
                  type="button"
                  className="notification-button"
                  title="Xem thông báo"
                  onClick={handleToggleNotifications}
                >
                  <span className="notification-icon">🔔</span>
                  {unreadCount > 0 && (
                    <span className="notification-badge">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {notificationOpen && (
                  <div className="notification-popup">
                    <div className="notification-popup-head">
                      <div>
                        <strong>Thông báo</strong>
                        <p>{unreadCount} thông báo chưa đọc</p>
                      </div>
                      <button
                        type="button"
                        className="notification-popup-link"
                        onClick={markAllNotificationsAsRead}
                        disabled={notificationActionLoading || unreadCount === 0}
                      >
                        {notificationActionLoading ? "Đang xử lý..." : "Đánh dấu đã đọc"}
                      </button>
                    </div>

                    <div className="notification-popup-body">
                      {notificationLoading ? (
                        <div className="notification-empty">Đang tải danh sách thông báo...</div>
                      ) : notificationItems.length === 0 ? (
                        <div className="notification-empty">Hiện chưa có thông báo.</div>
                      ) : (
                        notificationItems.map((item, index) => {
                          const isRead = Boolean(item.isRead || item.is_read || item.status === "READ");

                          return (
                            <button
                              key={item.id || index}
                              type="button"
                              className={`notification-item${isRead ? "" : " unread"}`}
                              onClick={() => handleNotificationClick(item)}
                              disabled={notificationActionLoading}
                            >
                              <div className="notification-item-top">
                                <strong>{item.title || "Thông báo hệ thống"}</strong>
                                <span>
                                  {isRead ? "Đã xem" : "Chưa đọc"}
                                </span>
                              </div>
                              <p>{item.message || "Không có nội dung hiển thị"}</p>
                              <small>
                                {formatNotificationTime(
                                  item.created_at || item.createdAt || item.updated_at
                                )}
                              </small>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {dashboardLoading && <div className="note-banner">Đang tải dữ liệu trang chủ...</div>}

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

          {activePage === "home" && (
            <section className="page active">
              <div className="page-grid">
                <div className="hero-card">
                  <div className="hero-copy">
                    <span className="eyebrow">TỔNG QUAN CỦA BẠN</span>
                    <h2>Theo dõi yêu cầu sửa chữa ngay trên trang chủ</h2>
                    <p>
                      Xem nhanh trạng thái xử lý, báo giá chờ phản hồi và các cập nhật mới nhất
                      của bạn trong một nơi.
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
                      <strong>Xin chào, {user.name || "bạn"}.</strong>
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
                        <div className="muted">Tất cả yêu cầu của bạn</div>
                      </div>

                      <div className="stat-card">
                        <span>Đang xử lý</span>
                        <strong>{String(counters.activeRequests || 0).padStart(2, "0")}</strong>
                        <div className="muted">Các yêu cầu đang được xử lý</div>
                      </div>

                      <div className="stat-card">
                        <span>Báo giá chờ phản hồi</span>
                        <strong>{String(counters.pendingQuotes || 0).padStart(2, "0")}</strong>
                        <div className="muted">Báo giá cần phản hồi</div>
                      </div>

                      <div className="stat-card">
                        <span>Cửa hàng đã xác minh</span>
                        <strong>{String(counters.verifiedStores || 0).padStart(2, "0")}</strong>
                        <div className="muted">Cửa hàng đã được xác minh</div>
                      </div>

                      <div className="stat-card">
                        <span>Thiết bị từng gửi sửa</span>
                        <strong>{String(counters.savedDevices || 0).padStart(2, "0")}</strong>
                        <div className="muted">Thiết bị bạn từng gửi sửa</div>
                      </div>

                      <div className="stat-card">
                        <span>Thông báo chưa đọc</span>
                        <strong>
                          {String(counters.unreadNotifications || 0).padStart(2, "0")}
                        </strong>
                        <div className="muted">Thông báo bạn chưa xem</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="home-layout">
                  <div className="surface">
                    <div className="section-head">
                      <div>
                        <span className="eyebrow">YÊU CẦU GẦN NHẤT</span>
                        <h3 className="section-title">Yêu cầu và báo giá mới nhất</h3>
                      </div>
                      <button className="mini-link" onClick={() => openPage("tracking")}>
                        Xem theo dõi →
                      </button>
                    </div>

                    <div className="stack-16">
                      {recentRequests.length === 0 && pendingQuotes.length === 0 && (
                        <div className="note-banner">
                          Hiện chưa có yêu cầu hoặc báo giá mới.
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
                            <span className="chip">{item.estimated_time || "Chưa có thời gian dự kiến"}</span>
                            <span className="chip">Yêu cầu #{item.request_id}</span>
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
                          <h3 className="section-title">Thiết bị từng gửi sửa</h3>
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
                          {trustedStores.length === 0 && (
                            <div className="summary-row">
                              <span>Cửa hàng uy tín</span>
                              <strong>Chưa có dữ liệu</strong>
                            </div>
                          )}

                          {trustedStores.map((item) => (
                            <div key={`verified-${item.id}`} className="summary-row">
                              <span>
                                {item.store_name} {renderVerifiedBadge(item, true)}
                              </span>
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
                    Điền thông tin tình trạng thiết bị của bạn. Hệ thống sẽ gợi ý cửa hàng phù hợp.
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
                          placeholder="Nhập số điện thoại"
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
                            placeholder="Nhập địa chỉ, ví dụ: 109 Nguyễn Thuật"
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
                        <span className="muted" style={{ fontSize: 12, marginTop: 6, display: "block" }}>
                          Bạn có thể nhập địa chỉ thủ công rồi chọn gợi ý gần đúng, hoặc bấm lấy GPS chính xác cao.
                        </span>

                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            marginTop: 10,
                            alignItems: "center",
                          }}
                        >
                          {locationSourceLabel && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "8px 12px",
                                borderRadius: 999,
                                background: "#eff6ff",
                                border: "1px solid #bfdbfe",
                                color: "#1d4ed8",
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              {locationSourceLabel}
                              {Number.isFinite(locationMeta.accuracy) && locationMeta.source === "gps"
                                ? ` · ±${Math.round(locationMeta.accuracy)}m`
                                : ""}
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
                        <button className="btn btn-secondary" type="button" onClick={handleUseTypedAddress}>
                          Dùng địa chỉ đã nhập
                        </button>
                        <button className="btn btn-secondary" type="button" onClick={() => getCurrentLocation({ forceRefresh: true })}>
                          {loadingLocation ? "Đang lấy GPS..." : "Lấy GPS chính xác cao"}
                        </button>
                        <button className="btn btn-secondary" type="button" onClick={fetchNearbyStores}>
                          {nearbyStoresLoading ? "Đang tìm cửa hàng..." : "Tìm cửa hàng gần"}
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

              {false && (
                <div
                  className="modal-overlay"
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(15, 23, 42, 0.72)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1200,
                    padding: "20px",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <div
                    className="modal-content"
                    style={{
                      backgroundColor: "white",
                      padding: "26px",
                      borderRadius: "24px",
                      width: "100%",
                      maxWidth: "920px",
                      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 16,
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        marginBottom: 18,
                      }}
                    >
                      <div>
                        <h2 style={{ margin: 0, color: "#0f172a" }}>Ghim vị trí chính xác</h2>
                        <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>
                          Nhập địa chỉ ở Đà Nẵng hoặc kéo ghim tới đúng vị trí của bạn, rồi bấm xác nhận.
                        </p>
                      </div>

                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => setMapPickerOpen(false)}
                      >
                        Đóng
                      </button>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1.5fr) minmax(280px, 0.9fr)",
                        gap: 18,
                        alignItems: "stretch",
                      }}
                    >
                      <div
                        ref={mapPickerContainerRef}
                        style={{
                          minHeight: 420,
                          borderRadius: 20,
                          overflow: "hidden",
                          border: "1px solid #dbe2ea",
                          background: "#f8fafc",
                        }}
                      />

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 14,
                          border: "1px solid #e2e8f0",
                          borderRadius: 20,
                          padding: 18,
                          background: "#f8fafc",
                        }}
                      >
                        <div
                          style={{
                            padding: 12,
                            borderRadius: 14,
                            background: "white",
                            border: "1px solid #e2e8f0",
                            color: "#334155",
                            fontSize: 13,
                            lineHeight: 1.55,
                          }}
                        >
                          {mapPickerStatus || "Click vào bản đồ để đặt ghim."}
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              padding: 12,
                              borderRadius: 14,
                              background: "white",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <div style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>Vĩ độ</div>
                            <strong style={{ color: "#0f172a", fontSize: 15 }}>
                              {Number.isFinite(Number(mapPickerDraft.lat))
                                ? Number(mapPickerDraft.lat).toFixed(6)
                                : "Chưa chọn"}
                            </strong>
                          </div>

                          <div
                            style={{
                              padding: 12,
                              borderRadius: 14,
                              background: "white",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <div style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>Kinh độ</div>
                            <strong style={{ color: "#0f172a", fontSize: 15 }}>
                              {Number.isFinite(Number(mapPickerDraft.lng))
                                ? Number(mapPickerDraft.lng).toFixed(6)
                                : "Chưa chọn"}
                            </strong>
                          </div>
                        </div>

                        <div
                          style={{
                            padding: 14,
                            borderRadius: 16,
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            color: "#1e3a8a",
                            fontSize: 13,
                            lineHeight: 1.6,
                          }}
                        >
                          Mẹo: nếu GPS báo sai số lớn hoặc laptop định vị lệch, bạn chỉ cần kéo ghim tới đúng ngôi nhà, ngõ hoặc khu vực mong muốn để chốt lại.
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: "auto", flexWrap: "wrap" }}>
                          <button
                            className="btn btn-secondary"
                            type="button"
                            onClick={() => {
                              setMapPickerOpen(false);
                              setMapPickerStatus("");
                            }}
                            style={{ flex: 1 }}
                          >
                            Hủy
                          </button>
                          <button
                            className="btn btn-primary"
                            type="button"
                            onClick={handleConfirmMapPicker}
                            disabled={mapPickerSaving}
                            style={{ flex: 1.4 }}
                          >
                            {mapPickerSaving ? "Đang lưu vị trí..." : "Xác nhận vị trí này"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                    <h2 style={{ marginBottom: "10px", color: "#0f172a" }}>Chọn cửa hàng</h2>
                    <p className="muted" style={{ marginBottom: "20px", color: "#64748b" }}>
                      {nearbyStores.length > 0
                        ? 'Danh sách dưới đây ưu tiên các cửa hàng gần vị trí của bạn. Cửa hàng nổi bật sẽ được hiển thị trước.'
                        : 'Dưới đây là các cửa hàng đã xác minh. Hãy chọn nơi bạn muốn gửi thiết bị.'}
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
                      {selectableStores.map((store, index) => (
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
                              <span className="store-name-row">
                                {store.store_name}
                                {renderVerifiedBadge(store, true)}
                              </span>
                            </strong>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 8,
                                alignItems: "center",
                                marginTop: 6,
                              }}
                            >
                              <span
                                className="muted"
                                style={{ fontSize: "13px", color: "#64748b" }}
                              >
                                {store.address || "Chưa có địa chỉ"} · ★ {store.google_rating || 0}
                                {store.distance !== undefined && store.distance !== null
                                  ? ` · ${Number(store.distance).toFixed(1)} km`
                                  : ""}
                              </span>

                              {Number(store?.is_premium_partner) === 1 && index === 0 && nearbyStores.length > 0 && (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "4px 8px",
                                    borderRadius: 999,
                                    background: "#fff7ed",
                                    border: "1px solid #fdba74",
                                    color: "#c2410c",
                                    fontSize: 12,
                                    fontWeight: 800,
                                  }}
                                >
                                  Nổi bật gần bạn
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() => submitRepairRequestWithStore(store.id)}
                          >
                            Gửi yêu cầu
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
                      Đóng
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
                      : "Danh sách cửa hàng đã xác minh"}
                  </h2>
                  <p className="muted">
                    {selectedStoreDetail
                      ? "Danh sách dịch vụ và sản phẩm cửa hàng đang cung cấp."
                      : "Danh sách cửa hàng đã được hệ thống xác minh."}
                  </p>
                </div>

                <div className="stores-layout">
                  <div className="surface">
                    {!selectedStoreDetail ? (
                      <>
                        <div className="section-head section-head-store-filter">
                          <div>
                            <span className="eyebrow">CỬA HÀNG ĐỀ XUẤT</span>
                            <h3 className="section-title">Ưu tiên uy tín và đánh giá</h3>
                          </div>

                          <div className="store-filter-tabs">
                            <button
                              type="button"
                              className={`store-filter-btn${storeFilter === "all" ? " active" : ""}`}
                              onClick={() => setStoreFilter("all")}
                            >
                              Tất cả ({verifiedStores.length})
                            </button>
                            <button
                              type="button"
                              className={`store-filter-btn${storeFilter === "trusted" ? " active" : ""}`}
                              onClick={() => setStoreFilter("trusted")}
                            >
                              Cửa hàng uy tín ({trustedStores.length})
                            </button>
                          </div>
                        </div>

                        <div className="store-grid">
                          {displayedStores.length === 0 && (
                            <div className="note-banner">
                              {storeFilter === "trusted"
                                ? 'Hiện chưa có cửa hàng nào thuộc nhóm uy tín.'
                                : 'Hiện chưa có cửa hàng phù hợp.'}
                            </div>
                          )}

                          {displayedStores.map((store) => (
                            <div key={store.id} className="store-card">
                              <div className="store-card-head">
                                <div>
                                  <div className="store-name-row">
                                    <h3>{store.store_name}</h3>
                                    {renderVerifiedBadge(store)}
                                  </div>
                                  <p className="muted">{store.address || "Chưa có địa chỉ"}</p>
                                </div>
                                <div className="rating-badge">★ {store.google_rating || 0}</div>
                              </div>

                              <p className="muted">
                                {store.description || "Cửa hàng chưa cập nhật mô tả."}
                              </p>

                              <div className="chips">
                                <span className="chip">{store.total_quotes || 0} báo giá</span>
                                <span className="chip">{store.total_reviews || 0} đánh giá</span>
                                <span className="chip">{getStorePackageLabel(store)}</span>
                              </div>

                              <div className="card-actions">
                                <button
                                  className="btn btn-primary"
                                  onClick={() => handleViewStoreDetail(store)}
                                >
                                  Xem chi tiết
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
                              Sản phẩm và dịch vụ nổi bật
                            </h3>
                          </div>
                        </div>

                        {loadingProducts ? (
                          <div className="note-banner" style={{ marginTop: "20px" }}>
                            Đang tải sản phẩm và dịch vụ...
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
                                Cửa hàng này chưa cập nhật sản phẩm hoặc dịch vụ.
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
                                  alert("Vui lòng nhập thông tin yêu cầu và chọn địa chỉ hợp lệ hoặc GPS trước khi gửi đơn.");
                                  return;
                                }
                                submitRepairRequestWithStore(selectedStoreDetail.id);
                              }, 500);
                            }}
                          >
                            Gửi yêu cầu cho {selectedStoreDetail.store_name}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <aside className="aside-card">
                    <div className="section-head">
                      <div>
                        <span className="eyebrow">THỐNG KÊ</span>
                        <h3 className="section-title">Tổng quan nhanh</h3>
                      </div>
                    </div>

                    <div className="summary-box">
                      <div className="summary-list">
                        <div className="summary-row">
                          <span>Cửa hàng đã xác minh</span>
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
                  <h2 className="page-title">Theo dõi yêu cầu sửa chữa</h2>
                </div>

                <div className="metrics-grid">
                  <div className="stat-card">
                    <span>Tổng yêu cầu</span>
                    <strong>{trackingRequests.length}</strong>
                    <div className="muted">Tổng số yêu cầu của bạn</div>
                  </div>
                  <div className="stat-card">
                    <span>Đang xử lý</span>
                    <strong>
                      {
                        trackingRequests.filter((x) =>
                          ["OPEN", "QUOTED", "IN_PROGRESS", "WAITING_STORE_CONFIRM", "WAITING_CUSTOMER_CONFIRM"].includes(x.status)
                        ).length
                      }
                    </strong>
                    <div className="muted">Các yêu cầu đang được xử lý</div>
                  </div>
                  <div className="stat-card">
                    <span>Đã hoàn tất</span>
                    <strong>{trackingRequests.filter((x) => x.status === "COMPLETED").length}</strong>
                    <div className="muted">Những yêu cầu đã hoàn tất</div>
                  </div>
                  <div className="stat-card">
                    <span>Đã hủy</span>
                    <strong>{trackingRequests.filter((x) => x.status === "CANCELLED").length}</strong>
                    <div className="muted">Những yêu cầu đã hủy</div>
                  </div>
                </div>

                <div className="surface">
                  <div className="section-head">
                    <div>
                      <span className="eyebrow">YÊU CẦU CỦA BẠN</span>
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
                    <div className="note-banner">Hiện chưa có yêu cầu nào.</div>
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
                          <p className="muted">{item.description || "Chưa có mô tả"}</p>
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

                            {item.status === "QUOTED" && item.quote_status === "PENDING" && (
                              <>
                                <button
                                  className="btn btn-primary"
                                  style={{ padding: "6px 12px", fontSize: "13px" }}
                                  onClick={() => handleAcceptQuote(item.id)}
                                >
                                  Đồng ý báo giá
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: "6px 12px", fontSize: "13px", borderColor: "#fecaca", color: "#b91c1c" }}
                                  onClick={() => handleRejectQuote(item.id)}
                                >
                                  Từ chối giá
                                </button>
                              </>
                            )}

                            {item.status === "WAITING_CUSTOMER_CONFIRM" && (
                              <button
                                className="btn btn-primary"
                                style={{ padding: "6px 12px", fontSize: "13px" }}
                                onClick={() => handleConfirmCompleted(item.id)}
                              >
                                Xác nhận đã hoàn thành
                              </button>
                            )}

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
                          <span>Loại thiết bị</span>
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
                      Chi tiết yêu cầu #RQ-{selectedTrackedRequest.id}
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
                        Thông tin bạn đã gửi
                      </h4>
                      <p style={{ margin: "0 0 8px 0" }}>
                        <strong>Thiết bị:</strong> {selectedTrackedRequest.device_name}
                      </p>
                      <p style={{ margin: "0 0 8px 0", color: "#ef4444" }}>
                        <strong>Vấn đề:</strong> {selectedTrackedRequest.title}
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
                        Ghi chú từ kỹ thuật viên / cửa hàng
                      </h4>
                      <p style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>
                        {selectedTrackedRequest.technician_note ||
                          "Cửa hàng chưa cập nhật ghi chú kỹ thuật cho yêu cầu này."}
                      </p>
                    </div>

                    <div className="summary-box">
                      <div className="summary-list">
                        <div className="summary-row">
                          <span>Trạng thái</span>
                          <strong>{statusLabel(selectedTrackedRequest.status)}</strong>
                        </div>
                        <div className="summary-row">
                          <span>Ngân sách dự kiến</span>
                          <strong>
                            {selectedTrackedRequest.budget
                              ? formatVND(selectedTrackedRequest.budget)
                              : "Chưa có"}
                          </strong>
                        </div>
                        <div className="summary-row">
                          <span>Kỹ thuật viên phụ trách</span>
                          <strong>{selectedTrackedRequest.employee_name || "Chưa giao kỹ thuật viên"}</strong>
                        </div>
                        <div className="summary-row">
                          <span>Giá báo từ cửa hàng</span>
                          <strong>
                            {selectedTrackedRequest.quote_price
                              ? formatVND(selectedTrackedRequest.quote_price)
                              : "Chưa có"}
                          </strong>
                        </div>
                        <div className="summary-row">
                          <span>Thời gian dự kiến</span>
                          <strong>{selectedTrackedRequest.quote_estimated_time || "Chưa có"}</strong>
                        </div>
                        <div className="summary-row">
                          <span>Ghi chú báo giá</span>
                          <strong>{selectedTrackedRequest.quote_message || "Chưa có"}</strong>
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
                        <h4 style={{ marginBottom: 12 }}>Ảnh đính kèm</h4>
                        <img
                          src={selectedTrackedRequest.image}
                          alt="Yêu cầu sửa chữa"
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

                    <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
                      {selectedTrackedRequest.status === "QUOTED" && selectedTrackedRequest.quote_status === "PENDING" && (
                        <>
                          <button className="btn btn-primary" onClick={() => handleAcceptQuote(selectedTrackedRequest.id)}>
                            Đồng ý báo giá
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ borderColor: "#fecaca", color: "#b91c1c" }}
                            onClick={() => handleRejectQuote(selectedTrackedRequest.id)}
                          >
                            Từ chối báo giá
                          </button>
                        </>
                      )}
                      {selectedTrackedRequest.status === "WAITING_CUSTOMER_CONFIRM" && (
                        <button className="btn btn-primary" onClick={() => handleConfirmCompleted(selectedTrackedRequest.id)}>
                          Xác nhận đã hoàn thành
                        </button>
                      )}
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
                        Bạn đang đánh giá yêu cầu RQ-{reviewModal.item.id} tại{" "}
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
                          Mức đánh giá
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
                          placeholder="Ví dụ: sửa nhanh, tư vấn rõ ràng, thái độ tốt..."
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
                  <span className="eyebrow">TRỢ LÝ AI</span>
                  <h2 className="page-title">Hỗ trợ chẩn đoán ban đầu</h2>
                  <p className="muted">
                    Nhập mô tả lỗi để nhận gợi ý ban đầu trước khi tạo yêu cầu sửa chữa.
                  </p>
                </div>

                <div className="chat-layout">
                  <div className="surface">
                    <div className="section-head">
                      <div>
                        <span className="eyebrow">GỢI Ý NHANH</span>
                        <h3 className="section-title">Mẫu gợi ý</h3>
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
                        <h3 className="section-title">Trợ lý IEMS</h3>
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
                        placeholder="Nhập mô tả lỗi của thiết bị..."
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
                  <h2 className="page-title">Tài khoản và thông tin cá nhân</h2>
                  <p className="muted">
                    Quản lý thông tin tài khoản, số điện thoại và dữ liệu đã lưu.
                  </p>
                </div>

                <div className="profile-layout">
                  <div className="profile-card">
                    <div className="profile-avatar">
                      {user.initials || buildInitials(user.name || "U")}
                    </div>
                    <h3 style={{ marginBottom: 8 }}>{user.name || "Chưa cập nhật tên"}</h3>
                    <p className="muted">{user.email || "Chưa cập nhật email"}</p>

                    <div className="profile-meta">
                      <div className="profile-meta-item">
                        <strong>Số điện thoại</strong>
                        <span>{user.phone || "Chưa cập nhật"}</span>
                      </div>
                      <div className="profile-meta-item">
                        <strong>Thiết bị từng gửi sửa</strong>
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
                          <h3 className="section-title">Thiết bị từng gửi sửa</h3>
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
                            <span>Yêu cầu đang xử lý</span>
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
