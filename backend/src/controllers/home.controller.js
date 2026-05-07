
const db = require('../config/db');

const buildInitials = (name = '') => {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('') || 'U'
  );
};

const roleLabelMap = {
  USER: 'Khách hàng',
  STORE: 'Cửa hàng',
  ADMIN: 'Quản trị viên',
};

const getHomeDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const promiseDb = db.promise();

    const [userRows] = await promiseDb.query(
      'SELECT id, name, email, phone, role FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!userRows.length) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
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
        (SELECT COUNT(*)
         FROM repair_requests
         WHERE user_id = ?) AS savedDevices,
        (SELECT COUNT(*)
         FROM notifications
         WHERE user_id = ? AND is_read = 0) AS unreadNotifications
      `,
      [userId, userId, userId, userId, userId, userId, userId]
    );

    const counters = counterRows[0] || {};

    const [rawRecentRequests] = await promiseDb.query(
      `
      SELECT *
      FROM repair_requests
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 5
      `,
      [userId]
    );

    const recentRequests = rawRecentRequests.map((row) => {
      return {
        id: row.id,
        title: row.title || "Yêu cầu sửa chữa",
        description: row.description || "",
        status: row.status,
        budget: row.budget || "",
        location: row.location || "",
        created_at: row.created_at,
        device_name: `${row.brand || ''} ${row.model || ''}`.trim() || row.device_type || "Thiết bị",
        device_category: row.device_type || "Chưa phân loại"
      };
    });

    // ĐÃ SỬA CHỖ NÀY: Xuống dòng đàng hoàng để không bị lỗi syntax
    const [rawPendingQuotes] = await promiseDb.query(
      `
      SELECT
        q.id AS quote_id,
        q.price,
        q.message,
        q.estimated_time,
        q.status AS quote_status,
        q.created_at AS quote_created_at,
        rr.*,
        s.store_name
      FROM quotes q
      INNER JOIN repair_requests rr ON rr.id = q.request_id
      INNER JOIN stores s ON s.id = q.store_id
      WHERE rr.user_id = ?
        AND q.status = 'PENDING'
      ORDER BY q.created_at DESC
      LIMIT 5
      `,
      [userId]
    );

    const pendingQuotes = rawPendingQuotes.map((row) => {
      return {
        id: row.quote_id,
        price: row.price,
        message: row.message,
        estimated_time: row.estimated_time,
        status: row.quote_status,
        created_at: row.quote_created_at,
        request_id: row.id,
        request_title: row.title || "Yêu cầu sửa chữa",
        request_status: row.status,
        device_name: `${row.brand || ''} ${row.model || ''}`.trim() || row.device_type || "Thiết bị",
        store_name: row.store_name
      };
    });

    const [rawSavedDevices] = await promiseDb.query(
      `
      SELECT *
      FROM repair_requests
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 5
      `,
      [userId]
    );

    const savedDevices = rawSavedDevices.map((row) => {
      return {
        id: row.id,
        name: `${row.brand || ''} ${row.model || ''}`.trim() || row.device_type || "Thiết bị",
        category: row.device_type || "Chưa phân loại",
        total_requests: 1,
        last_request_at: row.created_at
      };
    });

    const [verifiedStores] = await promiseDb.query(
      `
      SELECT
        s.id,
        s.store_name,
        s.address,
        s.google_rating,
        s.description,
        s.service_types,
        (
          SELECT sub.name
          FROM store_subscriptions ss
          INNER JOIN subscriptions sub ON sub.id = ss.subscription_id
          WHERE ss.store_id = s.id
            AND (ss.end_date IS NULL OR ss.end_date >= CURDATE())
          ORDER BY COALESCE(ss.end_date, '9999-12-31') DESC, ss.id DESC
          LIMIT 1
        ) AS package_name,
        EXISTS(
          SELECT 1
          FROM store_subscriptions ss
          INNER JOIN subscriptions sub ON sub.id = ss.subscription_id
          WHERE ss.store_id = s.id
            AND (ss.end_date IS NULL OR ss.end_date >= CURDATE())
            AND sub.name IN ('VERIFIED', 'PREMIUM')
        ) AS is_trusted_store,
        EXISTS(
          SELECT 1
          FROM store_subscriptions ss
          INNER JOIN subscriptions sub ON sub.id = ss.subscription_id
          WHERE ss.store_id = s.id
            AND (ss.end_date IS NULL OR ss.end_date >= CURDATE())
            AND sub.name IN ('VERIFIED', 'PREMIUM')
        ) AS has_verified_badge
      FROM stores s
      WHERE s.status = 'approved'
      ORDER BY is_trusted_store DESC, s.google_rating DESC, s.created_at DESC
      LIMIT 12
      `
    );

    return res.json({
      message: 'Lấy dữ liệu trang chủ thành công',
      header: {
        title: 'Trang chủ',
        subtitle: 'Tổng quan ưu tiên',
        searchPlaceholder: 'Tìm yêu cầu, cửa hàng, thiết bị...',
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
    console.error('HOME DASHBOARD ERROR:', error);
    return res.status(500).json({
      message: 'Lỗi server khi lấy dữ liệu trang chủ',
      error: error.message,
    });
  }
};

const searchHome = async (req, res) => {
  try {
    const userId = req.user.id;
    const q = (req.query.q || '').trim();

    if (!q) {
      return res.json({
        message: 'Không có từ khóa tìm kiếm',
        q: '',
        repairRequests: [],
        stores: [],
        devices: [],
      });
    }

    const keyword = `%${q}%`;
    const promiseDb = db.promise();

    const [rawRepairRequests] = await promiseDb.query(
      `
      SELECT *
      FROM repair_requests
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [userId]
    );

    const repairRequests = rawRepairRequests.map(row => {
      return {
        id: row.id,
        status: row.status,
        created_at: row.created_at,
        title: row.title || "Yêu cầu sửa chữa",
        description: row.description || "",
        device_name: `${row.brand || ''} ${row.model || ''}`.trim() || row.device_type || "Thiết bị"
      };
    }).filter(item => {
      const target = [item.title, item.description, item.device_name].join(' ').toLowerCase();
      return target.includes(q.toLowerCase());
    }).slice(0, 5);

    const [stores] = await promiseDb.query(
      `
      SELECT
        s.id,
        s.store_name,
        s.address,
        s.google_rating,
        s.status,
        s.service_types,
        (
          SELECT sub.name
          FROM store_subscriptions ss
          INNER JOIN subscriptions sub ON sub.id = ss.subscription_id
          WHERE ss.store_id = s.id
            AND (ss.end_date IS NULL OR ss.end_date >= CURDATE())
          ORDER BY COALESCE(ss.end_date, '9999-12-31') DESC, ss.id DESC
          LIMIT 1
        ) AS package_name,
        EXISTS(
          SELECT 1
          FROM store_subscriptions ss
          INNER JOIN subscriptions sub ON sub.id = ss.subscription_id
          WHERE ss.store_id = s.id
            AND (ss.end_date IS NULL OR ss.end_date >= CURDATE())
            AND sub.name IN ('VERIFIED', 'PREMIUM')
        ) AS is_trusted_store,
        EXISTS(
          SELECT 1
          FROM store_subscriptions ss
          INNER JOIN subscriptions sub ON sub.id = ss.subscription_id
          WHERE ss.store_id = s.id
            AND (ss.end_date IS NULL OR ss.end_date >= CURDATE())
            AND sub.name IN ('VERIFIED', 'PREMIUM')
        ) AS has_verified_badge
      FROM stores s
      WHERE s.status = 'approved'
        AND (
          s.store_name LIKE ?
          OR s.address LIKE ?
          OR s.description LIKE ?
          OR s.service_types LIKE ?
        )
      ORDER BY is_trusted_store DESC, s.google_rating DESC, s.created_at DESC
      LIMIT 5
      `,
      [keyword, keyword, keyword, keyword]
    );

    const [rawDevices] = await promiseDb.query(
      `
      SELECT *
      FROM repair_requests
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [userId]
    );

    const deviceMap = new Map();

    rawDevices.forEach((row) => {
      const key = `${row.device_type || ''}-${row.brand || ''}-${row.model || ''}`;
      if (!deviceMap.has(key)) {
        deviceMap.set(key, {
          id: row.id,
          name: `${row.brand || ''} ${row.model || ''}`.trim() || row.device_type || "Thiết bị",
          category: row.device_type || "Chưa phân loại",
          created_at: row.created_at,
        });
      }
    });

    const devices = Array.from(deviceMap.values())
      .filter((item) => {
        const target = [item.name, item.category].join(' ').toLowerCase();
        return target.includes(q.toLowerCase());
      })
      .slice(0, 5);

    return res.json({
      message: 'Tìm kiếm thành công',
      q,
      repairRequests,
      stores,
      devices,
    });
  } catch (error) {
    console.error('SEARCH HOME ERROR:', error);
    return res.status(500).json({
      message: 'Lỗi server khi tìm kiếm dữ liệu trang chủ',
      error: error.message,
    });
  }
};

module.exports = {
  getHomeDashboard,
  searchHome,
};
