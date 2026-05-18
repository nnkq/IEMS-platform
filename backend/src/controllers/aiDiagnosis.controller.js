const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const db = require("../config/db");

const AI_CHAT_UPLOAD_DIR = path.join(__dirname, "../../uploads/ai-chat");
const MAX_CHAT_IMAGE_BYTES = 6 * 1024 * 1024;
const API_PUBLIC_ORIGIN = process.env.API_PUBLIC_ORIGIN || "http://localhost:5000";

const ISSUE_PRODUCT_KEYWORDS = {
  overheating_issue: ["vệ sinh", "keo", "tản nhiệt", "quạt"],
  screen_issue: ["màn hình", "lcd", "screen"],
  battery_charging_issue: ["pin", "sạc", "adapter", "battery"],
  boot_issue: ["ram", "ssd", "ổ cứng", "main", "mainboard"],
  keyboard_issue: ["bàn phím", "keyboard", "phím"],
  audio_issue: ["loa", "mic", "audio"],
};

const queryAsync = (sql, values = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, values, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

const execAsync = (sql, values = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

const CHAT_SESSION_KIND = "chat_session";
const CHAT_SESSION_VERSION = 1;

const isChatSessionPayload = (raw) => {
  if (!raw || typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed?.kind === CHAT_SESSION_KIND && Array.isArray(parsed.messages);
  } catch {
    return false;
  }
};

const parseChatSessionPayload = (raw) => {
  if (!isChatSessionPayload(raw)) return null;
  try {
    return JSON.parse(raw.trim());
  } catch {
    return null;
  }
};

const serializeChatSession = (messages) =>
  JSON.stringify({
    version: CHAT_SESSION_VERSION,
    kind: CHAT_SESSION_KIND,
    messages: Array.isArray(messages) ? messages : [],
    updatedAt: new Date().toISOString(),
  });

const sessionTitleFromMessages = (messages = []) => {
  const firstUser = messages.find(
    (m) =>
      m?.role === "user" &&
      (String(m.text || "").trim() || (Array.isArray(m.images) && m.images.length > 0))
  );
  const text =
    String(firstUser?.text || "").trim() ||
    (firstUser?.images?.length ? "Ảnh thiết bị đính kèm" : "Phiên chat AI");
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
};

const buildPublicUploadUrl = (filename) =>
  `${API_PUBLIC_ORIGIN}/uploads/ai-chat/${filename}`;

exports.uploadChatImage = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { image, filename: originalName = "" } = req.body;
    if (!image || typeof image !== "string") {
      return res.status(400).json({ message: "Thiếu dữ liệu ảnh" });
    }

    const match = image.match(/^data:image\/([\w+.-]+);base64,(.+)$/i);
    if (!match) {
      return res.status(400).json({ message: "Định dạng ảnh không hợp lệ" });
    }

    let ext = String(match[1] || "jpeg").toLowerCase().replace("jpeg", "jpg");
    if (ext === "svg+xml") ext = "svg";
    const allowed = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
    if (!allowed.has(ext)) {
      return res.status(400).json({ message: "Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF" });
    }

    const buffer = Buffer.from(match[2], "base64");
    if (!buffer.length) {
      return res.status(400).json({ message: "Ảnh rỗng" });
    }
    if (buffer.length > MAX_CHAT_IMAGE_BYTES) {
      return res.status(400).json({ message: "Ảnh quá lớn (tối đa 6MB)" });
    }

    fs.mkdirSync(AI_CHAT_UPLOAD_DIR, { recursive: true });

    const safeBase = String(originalName)
      .replace(/[^\w.\-]+/g, "_")
      .slice(0, 40);
    const storedName = `${userId}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${safeBase ? `-${safeBase}` : ""}.${ext}`;
    const storedPath = path.join(AI_CHAT_UPLOAD_DIR, storedName);

    fs.writeFileSync(storedPath, buffer);

    return res.status(201).json({
      url: buildPublicUploadUrl(storedName),
      path: `/uploads/ai-chat/${storedName}`,
      name: originalName || storedName,
    });
  } catch (error) {
    console.error("uploadChatImage error:", error);
    return res.status(500).json({ message: "Không thể lưu ảnh chat" });
  }
};

const estimatePriceFromDiagnosis = (diagnosis) => {
  const prices = [];
  if (Array.isArray(diagnosis?.price_sources)) {
    diagnosis.price_sources.forEach((item) => {
      const value = Number(item?.price);
      if (Number.isFinite(value) && value > 0) prices.push(value);
    });
  }
  if (Array.isArray(diagnosis?.recommended_stores)) {
    diagnosis.recommended_stores.forEach((item) => {
      const value = Number(item?.estimated_price);
      if (Number.isFinite(value) && value > 0) prices.push(value);
    });
  }
  if (!prices.length) return null;
  return Math.min(...prices);
};

const formatLogTimeLabel = (createdAt) => {
  if (!createdAt) return "";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
};

const mapLegacySessionRow = (row) => {
  const timeLabel = formatLogTimeLabel(row.created_at);
  const messages = [];

  if (row.user_description) {
    messages.push({
      role: "user",
      title: "Bạn",
      time: timeLabel,
      text: String(row.user_description),
    });
  }

  if (row.ai_diagnosis) {
    messages.push({
      role: "ai",
      title: "Trợ lý IEMS",
      time: timeLabel,
      text: String(row.ai_diagnosis),
    });
  }

  const title = String(row.user_description || "Phiên chẩn đoán AI").trim();

  return {
    id: row.id,
    title: title.length > 120 ? `${title.slice(0, 117)}...` : title,
    preview: row.user_description,
    messageCount: messages.length,
    estimatedPrice: row.estimated_price != null ? Number(row.estimated_price) : null,
    createdAt: row.created_at,
    updatedAt: row.created_at,
    messages,
    legacy: true,
  };
};

const mapSessionRow = (row) => {
  const payload = parseChatSessionPayload(row.ai_diagnosis);
  if (!payload) {
    return mapLegacySessionRow(row);
  }

  const messages = payload.messages || [];
  return {
    id: row.id,
    title: sessionTitleFromMessages(messages) || row.user_description,
    preview: row.user_description,
    messageCount: messages.length,
    estimatedPrice: row.estimated_price != null ? Number(row.estimated_price) : null,
    createdAt: row.created_at,
    updatedAt: payload.updatedAt || row.created_at,
    messages,
    legacy: false,
  };
};

const toSessionSummary = (session) => ({
  id: session.id,
  title: session.title,
  preview: session.preview,
  messageCount: session.messageCount,
  estimatedPrice: session.estimatedPrice,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
  legacy: Boolean(session.legacy),
});

exports.listChatSessions = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const rows = await queryAsync(
      `
      SELECT id, user_description, ai_diagnosis, estimated_price, created_at
      FROM ai_diagnosis_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 100
      `,
      [userId]
    );

    const sessions = rows
      .map((row) => mapSessionRow(row))
      .filter((session) => session.messageCount > 0 || session.preview)
      .map(toSessionSummary);

    return res.json({ sessions });
  } catch (error) {
    console.error("listChatSessions error:", error);
    return res.status(500).json({ message: "Không thể tải lịch sử chat AI" });
  }
};

exports.getChatSession = async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!Number.isFinite(sessionId)) {
      return res.status(400).json({ message: "ID phiên chat không hợp lệ" });
    }

    const rows = await queryAsync(
      `
      SELECT id, user_description, ai_diagnosis, estimated_price, created_at
      FROM ai_diagnosis_logs
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [sessionId, userId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Không tìm thấy phiên chat" });
    }

    const session = mapSessionRow(rows[0]);
    if (!session.messageCount && !session.preview) {
      return res.status(404).json({ message: "Không tìm thấy phiên chat" });
    }

    return res.json({ session });
  } catch (error) {
    console.error("getChatSession error:", error);
    return res.status(500).json({ message: "Không thể tải phiên chat" });
  }
};

exports.createChatSession = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { messages = [], estimated_price = null } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!Array.isArray(messages)) {
      return res.status(400).json({ message: "messages phải là mảng" });
    }

    const title = sessionTitleFromMessages(messages);
    const result = await execAsync(
      `
      INSERT INTO ai_diagnosis_logs (user_id, device_id, user_description, ai_diagnosis, estimated_price)
      VALUES (?, NULL, ?, ?, ?)
      `,
      [
        userId,
        title,
        serializeChatSession(messages),
        estimated_price != null ? Number(estimated_price) : null,
      ]
    );

    const rows = await queryAsync(
      `
      SELECT id, user_description, ai_diagnosis, estimated_price, created_at
      FROM ai_diagnosis_logs
      WHERE id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    return res.status(201).json({ session: mapSessionRow(rows[0]) });
  } catch (error) {
    console.error("createChatSession error:", error);
    return res.status(500).json({ message: "Không thể tạo phiên chat" });
  }
};

exports.updateChatSession = async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = Number(req.params.id);
    const { messages = [], estimated_price } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!Number.isFinite(sessionId)) {
      return res.status(400).json({ message: "ID phiên chat không hợp lệ" });
    }
    if (!Array.isArray(messages)) {
      return res.status(400).json({ message: "messages phải là mảng" });
    }

    const existing = await queryAsync(
      `
      SELECT id, ai_diagnosis
      FROM ai_diagnosis_logs
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [sessionId, userId]
    );

    if (!existing.length) {
      return res.status(404).json({ message: "Không tìm thấy phiên chat" });
    }

    const title = sessionTitleFromMessages(messages);
    const priceValue =
      estimated_price !== undefined && estimated_price !== null
        ? Number(estimated_price)
        : null;

    await queryAsync(
      `
      UPDATE ai_diagnosis_logs
      SET user_description = ?, ai_diagnosis = ?, estimated_price = COALESCE(?, estimated_price)
      WHERE id = ? AND user_id = ?
      `,
      [title, serializeChatSession(messages), priceValue, sessionId, userId]
    );

    const rows = await queryAsync(
      `
      SELECT id, user_description, ai_diagnosis, estimated_price, created_at
      FROM ai_diagnosis_logs
      WHERE id = ?
      LIMIT 1
      `,
      [sessionId]
    );

    return res.json({ session: mapSessionRow(rows[0]) });
  } catch (error) {
    console.error("updateChatSession error:", error);
    return res.status(500).json({ message: "Không thể cập nhật phiên chat" });
  }
};

exports.diagnoseWithStoreData = async (req, res) => {
  try {
    const { symptom, device_type = "laptop" } = req.body;

    if (!symptom || !symptom.trim()) {
      return res.status(400).json({ message: "Thiếu mô tả triệu chứng" });
    }

    const aiResponse = await axios.post("http://localhost:5001/predict", {
      symptom,
      device_type,
    });

    const ai = aiResponse.data;

    if (!ai.issue || ai.issue === "unknown_issue") {
      return res.json({
        ...ai,
        price_sources: [],
        recommended_stores: [],
      });
    }

    const keywords = ISSUE_PRODUCT_KEYWORDS[ai.issue] || [];
    const likeConditions = keywords
      .map(() => "(LOWER(p.name) LIKE LOWER(?) OR LOWER(p.type) LIKE LOWER(?))")
      .join(" OR ");

    const likeValues = keywords.flatMap((keyword) => [
      `%${keyword}%`,
      `%${keyword}%`,
    ]);

    let products = [];

    if (keywords.length > 0) {
      products = await queryAsync(
        `
        SELECT
          p.id,
          p.name,
          p.type,
          p.price,
          s.id AS store_id,
          s.store_name,
          s.address,
          s.phone,
          s.latitude,
          s.longitude,
          s.google_rating,
          s.rating_avg,
          s.total_reviews
        FROM products p
        JOIN stores s ON s.user_id = p.user_id
        WHERE s.status = 'approved'
          AND (${likeConditions})
        ORDER BY
          COALESCE(s.rating_avg, s.google_rating, 0) DESC,
          p.price ASC
        LIMIT 5
        `,
        likeValues
      );
    }

    const priceSources = products.map((item) => ({
      product_id: item.id,
      part_name: item.name,
      type: item.type,
      price: Number(item.price),
      store_id: item.store_id,
      store_name: item.store_name,
      address: item.address,
      phone: item.phone,
      rating: item.rating_avg || item.google_rating || 0,
      total_reviews: item.total_reviews || 0,
    }));

    const recommendedStores = products.map((item) => ({
      store_id: item.store_id,
      store_name: item.store_name,
      address: item.address,
      phone: item.phone,
      rating: item.rating_avg || item.google_rating || 0,
      estimated_price: Number(item.price),
      matched_product: item.name,
    }));

    return res.json({
      ...ai,
      price_sources: priceSources,
      recommended_stores: recommendedStores,
      disclaimer:
        "Giá được lấy từ sản phẩm cửa hàng đã đăng trên hệ thống. Báo giá cuối cùng phụ thuộc kiểm tra thực tế.",
    });
  } catch (error) {
    console.error("AI diagnosis enrich error:", error);
    return res.status(500).json({
      message: "Không thể chẩn đoán hoặc lấy dữ liệu cửa hàng",
      error: error.message,
    });
  }
};
