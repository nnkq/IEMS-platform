const db = require("../config/db");

const buildInitials = (name = "") => {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("") || "U"
  );
};

const roleLabelMap = {
  USER: "Khách hàng",
  STORE: "Cửa hàng",
  ADMIN: "Quản trị viên",
};

const getHomeDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const promiseDb = db.promise();

    const [userRows] = await promiseDb.query(
      "SELECT id, name, email, phone, role FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!userRows.length) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const user = userRows[0];

    const [counterRows] = await promiseDb.query(
      `
      SELECT
        (SELECT COUNT(*) FROM repair_requests WHERE user_id = ?) AS totalRequests,
        (SELECT COUNT(*) FROM repair_requests WHERE user_id = ? AND status IN ('OPEN', 'QUOTED', 'IN_PROGRESS')) AS activeRequests,
        (SELECT COUNT(*) FROM repair_requests WHERE user_id = ? AND status = 'COMPLETED') AS completedRequests,
        (SELECT COUNT(*)
         FROM quotes q
         INNER JOIN repair_requests rr ON rr.id = q.request_id
         WHERE rr.user_id = ? AND q.status = 'PENDING') AS pendingQuotes,
        (SELECT COUNT(*) FROM stores WHERE status = 'approved') AS verifiedStores,
        (SELECT COUNT(DISTINCT device_id)
         FROM repair_requests
         WHERE user_id = ? AND device_id IS NOT NULL) AS savedDevices,
        (SELECT COUNT(*)
         FROM notifications
         WHERE user_id = ? AND is_read = 0) AS unreadNotifications
      `,
      [userId, userId, userId, userId, userId, userId]
    );

    const counters = counterRows[0] || {};

    const [recentRequests] = await promiseDb.query(
      `
      SELECT
        rr.id,
        rr.title,
        rr.description,
        rr.status,
        rr.budget,
        rr.location,
        rr.created_at,
        d.name AS device_name,
        sc.name AS device_category
      FROM repair_requests rr
      LEFT JOIN devices d ON d.id = rr.device_id
      LEFT JOIN service_categories sc ON sc.id = d.category_id
      WHERE rr.user_id = ?
      ORDER BY rr.created_at DESC
      LIMIT 5
      `,
      [userId]
    );

    const [pendingQuotes] = await promiseDb.query(
      `
      SELECT
        q.id,
        q.price,
        q.message,
        q.estimated_time,
        q.status,
        q.created_at,
        rr.id AS request_id,
        rr.title AS request_title,
        rr.status AS request_status,
        d.name AS device_name,
        s.store_name
      FROM quotes q
      INNER JOIN repair_requests rr ON rr.id = q.request_id
      LEFT JOIN devices d ON d.id = rr.device_id
      INNER JOIN stores s ON s.id = q.store_id
      WHERE rr.user_id = ?
        AND q.status = 'PENDING'
      ORDER BY q.created_at DESC
      LIMIT 5
      `,
      [userId]
    );

    const [savedDevices] = await promiseDb.query(
      `
      SELECT
        d.id,
        d.name,
        sc.name AS category,
        COUNT(rr.id) AS total_requests,
        MAX(rr.created_at) AS last_request_at
      FROM repair_requests rr
      INNER JOIN devices d ON d.id = rr.device_id
      LEFT JOIN service_categories sc ON sc.id = d.category_id
      WHERE rr.user_id = ?
      GROUP BY d.id, d.name, sc.name
      ORDER BY last_request_at DESC
      LIMIT 5
      `,
      [userId]
    );

    const [verifiedStores] = await promiseDb.query(
      `
      SELECT
        s.id,
        s.store_name,
        s.address,
        s.google_rating,
        s.description
      FROM stores s
      WHERE s.status = 'approved'
      ORDER BY s.google_rating DESC, s.created_at DESC
      LIMIT 5
      `
    );

    return res.json({
      message: "Lấy dữ liệu trang chủ thành công",
      header: {
        title: "Trang chủ",
        subtitle: "Tổng quan ưu tiên",
        searchPlaceholder: "Tìm yêu cầu, cửa hàng, thiết bị...",
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        roleLabel: roleLabelMap[user.role] || user.role,
        initials: buildInitials(user.name),
      },
      counters: {
        totalRequests: Number(counters.totalRequests || 0),
        activeRequests: Number(counters.activeRequests || 0),
        completedRequests: Number(counters.completedRequests || 0),
        pendingQuotes: Number(counters.pendingQuotes || 0),
        verifiedStores: Number(counters.verifiedStores || 0),
        savedDevices: Number(counters.savedDevices || 0),
        unreadNotifications: Number(counters.unreadNotifications || 0),
      },
      recentRequests,
      pendingQuotes,
      savedDevices,
      verifiedStores,
    });
  } catch (error) {
    console.error("HOME DASHBOARD ERROR:", error);
    return res.status(500).json({
      message: "Lỗi server khi lấy dữ liệu trang chủ",
      error: error.message,
    });
  }
};

const searchHome = async (req, res) => {
  try {
    const userId = req.user.id;
    const q = (req.query.q || "").trim();

    if (!q) {
      return res.json({
        message: "Không có từ khóa tìm kiếm",
        q: "",
        repairRequests: [],
        stores: [],
        devices: [],
      });
    }

    const keyword = `%${q}%`;
    const promiseDb = db.promise();

    const [repairRequests] = await promiseDb.query(
      `
      SELECT
        rr.id,
        rr.title,
        rr.status,
        rr.created_at,
        d.name AS device_name
      FROM repair_requests rr
      LEFT JOIN devices d ON d.id = rr.device_id
      WHERE rr.user_id = ?
        AND (
          rr.title LIKE ?
          OR rr.description LIKE ?
          OR d.name LIKE ?
        )
      ORDER BY rr.created_at DESC
      LIMIT 5
      `,
      [userId, keyword, keyword, keyword]
    );

    const [stores] = await promiseDb.query(
      `
      SELECT
        id,
        store_name,
        address,
        google_rating,
        status
      FROM stores
      WHERE status = 'approved'
        AND (
          store_name LIKE ?
          OR address LIKE ?
          OR description LIKE ?
        )
      ORDER BY google_rating DESC, created_at DESC
      LIMIT 5
      `,
      [keyword, keyword, keyword]
    );

    const [devices] = await promiseDb.query(
      `
      SELECT
        d.id,
        d.name,
        sc.name AS category
      FROM devices d
      LEFT JOIN service_categories sc ON sc.id = d.category_id
      WHERE d.name LIKE ?
         OR sc.name LIKE ?
      ORDER BY d.name ASC
      LIMIT 5
      `,
      [keyword, keyword]
    );

    return res.json({
      message: "Tìm kiếm thành công",
      q,
      repairRequests,
      stores,
      devices,
    });
  } catch (error) {
    console.error("HOME SEARCH ERROR:", error);
    return res.status(500).json({
      message: "Lỗi server khi tìm kiếm",
      error: error.message,
    });
  }
};

module.exports = {
  getHomeDashboard,
  searchHome,
};