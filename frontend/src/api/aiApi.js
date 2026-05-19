import axios from "axios";

export const API_ORIGIN = "http://localhost:5000";
const API_BASE = `${API_ORIGIN}/api/ai`;

/** Base URL for the AI diagnosis API — exported for UI (local vs online badge) only. */
export const AI_DIAGNOSIS_BASE_URL = API_BASE;

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const resolveAiAssetUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return `${API_ORIGIN}${url.startsWith("/") ? url : `/${url}`}`;
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Không đọc được file ảnh"));
    reader.readAsDataURL(file);
  });

/**
 * Upload a chat image to the server (persisted on disk, URL stored in session JSON).
 */
export const uploadAiChatImage = async (file) => {
  const dataUrl = await readFileAsDataUrl(file);
  const response = await api.post("/upload-image", {
    image: dataUrl,
    filename: file.name,
  });
  return {
    url: response.data?.url || resolveAiAssetUrl(response.data?.path),
    name: response.data?.name || file.name,
  };
};

/**
 * Call the AI diagnosis service to predict device issue
 */
export const diagnoseDevice = async (symptom, deviceType = "") => {
  try {
    const payload = {
      symptom: symptom.trim(),
    };

    if (deviceType) {
      payload.device_type = deviceType.toLowerCase();
    }

    const response = await api.post("/diagnose", payload);

    return response.data;
  } catch (error) {
    console.error("Lỗi gọi AI diagnosis API:", error);

    return {
      issue: "error",
      confidence: 0,
      device_type: deviceType || "unknown",
      severity: "unknown",
      causes: [],
      suggestions: [],
      message:
        error.response?.data?.message ||
        "Không thể kết nối đến dịch vụ AI. Vui lòng thử lại.",
    };
  }
};

export const listAiChatSessions = async () => {
  const response = await api.get("/sessions");
  return response.data?.sessions || [];
};

export const getAiChatSession = async (sessionId) => {
  const response = await api.get(`/sessions/${sessionId}`);
  return response.data?.session;
};

export const createAiChatSession = async (messages, estimatedPrice = null) => {
  const response = await api.post("/sessions", {
    messages,
    estimated_price: estimatedPrice,
  });
  return response.data?.session;
};

export const updateAiChatSession = async (sessionId, messages, estimatedPrice) => {
  const payload = { messages };
  if (estimatedPrice != null) {
    payload.estimated_price = estimatedPrice;
  }
  const response = await api.put(`/sessions/${sessionId}`, payload);
  return response.data?.session;
};

export default {
  diagnoseDevice,
  uploadAiChatImage,
  resolveAiAssetUrl,
  listAiChatSessions,
  getAiChatSession,
  createAiChatSession,
  updateAiChatSession,
};
