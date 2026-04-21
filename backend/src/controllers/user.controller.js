const db = require('../config/db');
const bcrypt = require('bcryptjs');

const promiseDb = db.promise();

const roleLabelMap = {
  USER: 'Khách hàng',
  STORE: 'Cửa hàng',
  ADMIN: 'Quản trị viên',
};

const buildInitials = (name = '') => {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'U'
  );
};

const normalizeString = (value) => {
  if (value === undefined || value === null) return null;
  const clean = String(value).trim();
  return clean === '' ? null : clean;
};

const extractRelatedRequestId = (text = '') => {
  if (!text) return null;

  const match = String(text).match(/#RQ-(\d+)/i);
  if (match) return Number(match[1]);

  return null;
};

const buildNotificationTarget = (notification = {}) => {
  const title = String(notification.title || '').toLowerCase();
  const message = String(notification.message || '').toLowerCase();
  const type = String(notification.type || '').toUpperCase();
  const content = `${title} ${message}`;

  if (
    type === 'QUOTE' ||
    type === 'ORDER' ||
    type === 'PAYMENT' ||
    content.includes('báo giá') ||
    content.includes('hoàn thành') ||
    content.includes('xác nhận') ||
    content.includes('sửa chữa') ||
    content.includes('theo dõi') ||
    content.includes('đơn') ||
    content.includes('#rq-')
  ) {
    return 'tracking';
  }

  if (
    content.includes('ưu đãi') ||
    content.includes('khuyến mãi') ||
    content.includes('giảm giá') ||
    content.includes('voucher') ||
    content.includes('cửa hàng')
  ) {
    return 'stores';
  }

  if (content.includes('ai') || content.includes('chẩn đoán')) {
    return 'chatbot';
  }

  return 'home';
};

const buildProfilePayload = async (userId) => {
  const [userRows] = await promiseDb.query(
    `
    SELECT
      id,
      name,
      email,
      phone,
      role,
      created_at,
      google_id,
      status
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [userId]
  );

  if (!userRows.length) {
    return null;
  }

  const user = userRows[0];

  const [statsRows] = await promiseDb.query(
    `
    SELECT
      (SELECT COUNT(*) FROM repair_requests WHERE user_id = ?) AS totalRequests,
      (SELECT COUNT(*) FROM repair_requests WHERE user_id = ? AND status = 'OPEN') AS openRequests,
      (SELECT COUNT(*) FROM repair_requests WHERE user_id = ? AND status = 'QUOTED') AS quotedRequests,
      (SELECT COUNT(*) FROM repair_requests WHERE user_id = ? AND status = 'IN_PROGRESS') AS inProgressRequests,
      (SELECT COUNT(*) FROM repair_requests WHERE user_id = ? AND status = 'COMPLETED') AS completedRequests,
      (SELECT COUNT(*) FROM repair_requests WHERE user_id = ? AND status = 'CANCELLED') AS cancelledRequests,

      (
        SELECT COUNT(*)
        FROM orders o
        LEFT JOIN repair_requests rr ON rr.id = o.request_id
        WHERE o.user_id = ? OR (o.user_id IS NULL AND rr.user_id = ?)
      ) AS totalOrders,
      (
        SELECT COUNT(*)
        FROM orders o
        LEFT JOIN repair_requests rr ON rr.id = o.request_id
        WHERE (o.user_id = ? OR (o.user_id IS NULL AND rr.user_id = ?))
          AND o.status = 'WAITING'
      ) AS waitingOrders,
      (
        SELECT COUNT(*)
        FROM orders o
        LEFT JOIN repair_requests rr ON rr.id = o.request_id
        WHERE (o.user_id = ? OR (o.user_id IS NULL AND rr.user_id = ?))
          AND o.status = 'COMPLETED'
      ) AS completedOrders,

      (
        SELECT COUNT(*)
        FROM payments p
        LEFT JOIN orders o ON o.id = p.order_id
        LEFT JOIN repair_requests rr ON rr.id = o.request_id
        WHERE (p.user_id = ? OR (p.user_id IS NULL AND rr.user_id = ?))
          AND p.status = 'PENDING'
      ) AS pendingPayments,
      (
        SELECT COUNT(*)
        FROM payments p
        LEFT JOIN orders o ON o.id = p.order_id
        LEFT JOIN repair_requests rr ON rr.id = o.request_id
        WHERE (p.user_id = ? OR (p.user_id IS NULL AND rr.user_id = ?))
          AND p.status = 'PAID'
      ) AS paidPayments,
      (
        SELECT COALESCE(SUM(p.amount), 0)
        FROM payments p
        LEFT JOIN orders o ON o.id = p.order_id
        LEFT JOIN repair_requests rr ON rr.id = o.request_id
        WHERE (p.user_id = ? OR (p.user_id IS NULL AND rr.user_id = ?))
          AND p.status = 'PAID'
      ) AS totalSpent,

      (SELECT COUNT(*) FROM reviews WHERE user_id = ?) AS totalReviews,
      (SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0) AS unreadNotifications,
      (SELECT COUNT(*) FROM ai_diagnosis_logs WHERE user_id = ?) AS aiDiagnosisCount
    `,
    [
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
      userId,
    ]
  );

  const stats = statsRows[0] || {};

  const [recentActivities] = await promiseDb.query(
    `
    SELECT *
    FROM (
      SELECT
        CONCAT('repair-', rr.id) AS id,
        'repair' AS type,
        CONCAT('Yêu cầu sửa chữa: ', rr.title) AS title,
        rr.created_at AS time,
        rr.status AS status
      FROM repair_requests rr
      WHERE rr.user_id = ?

      UNION ALL

      SELECT
        CONCAT('quote-', q.id) AS id,
        'quote' AS type,
        CONCAT('Nhận báo giá từ ', COALESCE(s.store_name, 'cửa hàng')) AS title,
        q.created_at AS time,
        q.status AS status
      FROM quotes q
      INNER JOIN repair_requests rr ON rr.id = q.request_id
      LEFT JOIN stores s ON s.id = q.store_id
      WHERE rr.user_id = ?

      UNION ALL

      SELECT
        CONCAT('order-', o.id) AS id,
        'order' AS type,
        CONCAT('Đơn sửa chữa #', o.id) AS title,
        COALESCE(o.start_time, o.end_time, rr.created_at) AS time,
        o.status AS status
      FROM orders o
      LEFT JOIN repair_requests rr ON rr.id = o.request_id
      WHERE o.user_id = ? OR (o.user_id IS NULL AND rr.user_id = ?)

      UNION ALL

      SELECT
        CONCAT('payment-', p.id) AS id,
        'payment' AS type,
        CONCAT('Thanh toán đơn #', COALESCE(p.order_id, 0)) AS title,
        p.created_at AS time,
        p.status AS status
      FROM payments p
      LEFT JOIN orders o ON o.id = p.order_id
      LEFT JOIN repair_requests rr ON rr.id = o.request_id
      WHERE p.user_id = ? OR (p.user_id IS NULL AND rr.user_id = ?)

      UNION ALL

      SELECT
        CONCAT('ai-', a.id) AS id,
        'ai' AS type,
        CONCAT('AI chẩn đoán ', COALESCE(d.name, 'thiết bị')) AS title,
        a.created_at AS time,
        'DONE' AS status
      FROM ai_diagnosis_logs a
      LEFT JOIN devices d ON d.id = a.device_id
      WHERE a.user_id = ?

      UNION ALL

      SELECT
        CONCAT('notification-', n.id) AS id,
        'notification' AS type,
        CONCAT('Thông báo: ', n.title) AS title,
        n.created_at AS time,
        CASE WHEN n.is_read = 1 THEN 'READ' ELSE 'UNREAD' END AS status
      FROM notifications n
      WHERE n.user_id = ?
    ) timeline
    ORDER BY time DESC
    LIMIT 10
    `,
    [userId, userId, userId, userId, userId, userId, userId, userId]
  );

  const [recentDiagnosis] = await promiseDb.query(
    `
    SELECT
      a.id,
      COALESCE(d.name, 'Thiết bị chưa rõ') AS deviceName,
      a.user_description AS userDescription,
      a.ai_diagnosis AS aiDiagnosis,
      a.estimated_price AS estimatedPrice,
      a.created_at AS createdAt
    FROM ai_diagnosis_logs a
    LEFT JOIN devices d ON d.id = a.device_id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
    LIMIT 5
    `,
    [userId]
  );

  const [rawRecentNotifications] = await promiseDb.query(
    `
    SELECT
      n.id,
      n.title,
      n.message,
      n.type,
      n.is_read AS isRead,
      n.created_at AS createdAt,
      n.sender_id AS senderId,
      sender.name AS senderName,
      sender.role AS senderRole
    FROM notifications n
    LEFT JOIN users sender ON sender.id = n.sender_id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 20
    `,
    [userId]
  );

  const recentNotifications = rawRecentNotifications.map((item) => ({
    ...item,
    relatedRequestId: extractRelatedRequestId(`${item.title || ''} ${item.message || ''}`),
    targetPage: buildNotificationTarget(item),
  }));

  return {
    user: {
      ...user,
      roleLabel: roleLabelMap[user.role] || user.role,
      initials: buildInitials(user.name),
      loginProvider: user.google_id ? 'GOOGLE' : 'LOCAL',
    },
    stats: {
      totalRequests: Number(stats.totalRequests || 0),
      openRequests: Number(stats.openRequests || 0),
      quotedRequests: Number(stats.quotedRequests || 0),
      inProgressRequests: Number(stats.inProgressRequests || 0),
      completedRequests: Number(stats.completedRequests || 0),
      cancelledRequests: Number(stats.cancelledRequests || 0),
      totalOrders: Number(stats.totalOrders || 0),
      waitingOrders: Number(stats.waitingOrders || 0),
      completedOrders: Number(stats.completedOrders || 0),
      pendingPayments: Number(stats.pendingPayments || 0),
      paidPayments: Number(stats.paidPayments || 0),
      totalSpent: Number(stats.totalSpent || 0),
      totalReviews: Number(stats.totalReviews || 0),
      unreadNotifications: Number(stats.unreadNotifications || 0),
      aiDiagnosisCount: Number(stats.aiDiagnosisCount || 0),
    },
    recentActivities,
    recentDiagnosis,
    recentNotifications,
  };
};

exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    const profile = await buildProfilePayload(userId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng',
      });
    }

    return res.json({
      success: true,
      message: 'Lấy hồ sơ thành công',
      ...profile,
    });
  } catch (error) {
    console.error('getMyProfile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy hồ sơ',
      error: error.sqlMessage || error.message,
    });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    const name = normalizeString(req.body.name);
    const phone = normalizeString(req.body.phone);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Tên người dùng không được để trống',
      });
    }

    await promiseDb.query(
      'UPDATE users SET name = ?, phone = ? WHERE id = ?',
      [name, phone, userId]
    );

    const profile = await buildProfilePayload(userId);

    return res.json({
      success: true,
      message: 'Cập nhật hồ sơ thành công',
      ...profile,
    });
  } catch (error) {
    console.error('updateMyProfile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật hồ sơ',
      error: error.sqlMessage || error.message,
    });
  }
};


exports.markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    await promiseDb.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    return res.json({
      success: true,
      message: 'Đã đánh dấu đã xem tất cả thông báo',
      unreadNotifications: 0,
    });
  } catch (error) {
    console.error('markAllNotificationsRead error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật thông báo',
      error: error.sqlMessage || error.message,
    });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const notificationId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã thông báo',
      });
    }

    const [rows] = await promiseDb.query(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ? LIMIT 1',
      [notificationId, userId]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông báo',
      });
    }

    await promiseDb.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );

    const [unreadRows] = await promiseDb.query(
      'SELECT COUNT(*) AS unreadNotifications FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    return res.json({
      success: true,
      message: 'Đã đánh dấu đã xem thông báo',
      unreadNotifications: Number(unreadRows[0]?.unreadNotifications || 0),
    });
  } catch (error) {
    console.error('markNotificationRead error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật thông báo',
      error: error.sqlMessage || error.message,
    });
  }
};

exports.changeMyPassword = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    const currentPassword = normalizeString(req.body.currentPassword);
    const newPassword = normalizeString(req.body.newPassword);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
      });
    }

    const [userRows] = await promiseDb.query(
      'SELECT id, password, google_id FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!userRows.length) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng',
      });
    }

    const user = userRows[0];

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản Google chưa có mật khẩu nội bộ để đổi',
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng',
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await promiseDb.query('UPDATE users SET password = ? WHERE id = ?', [
      hashedPassword,
      userId,
    ]);

    return res.json({
      success: true,
      message: 'Đổi mật khẩu thành công',
    });
  } catch (error) {
    console.error('changeMyPassword error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi đổi mật khẩu',
      error: error.sqlMessage || error.message,
    });
  }
};