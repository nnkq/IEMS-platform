const db = require('../config/db');

// ─── HELPER: PROMISE WRAPPER ──────────────────────────────────────────────
const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

// =============================================================================
// 1. PHÊ DUYỆT CỬA HÀNG (STORES)
// =============================================================================
const getPendingStores = async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        s.id, s.store_name AS name, s.address, s.google_maps_link AS mapsLink,
        s.description AS services, s.status, s.created_at,
        u.name AS owner, u.email, u.phone
      FROM stores s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'pending'
      ORDER BY s.created_at DESC
    `);
    res.status(200).json(rows);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const approveStore = async (req, res) => {
  const { storeId } = req.params;
  try {
    const { initialRating } = req.body || {};
    await query(`UPDATE stores SET status = 'approved', google_rating = ? WHERE id = ?`, [initialRating || 5.0, storeId]);
    await query(`UPDATE users SET role = 'STORE' WHERE id = (SELECT user_id FROM stores WHERE id = ?)`, [storeId]);
    res.status(200).json({ message: 'Đã duyệt' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

const rejectStore = async (req, res) => {
  const { storeId } = req.params;
  try {
    await query(`UPDATE stores SET status = 'rejected' WHERE id = ?`, [storeId]);
    res.status(200).json({ message: 'Đã từ chối' });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// =============================================================================
// 2. QUẢN LÝ TIẾN TRÌNH (ORDERS / REQUESTS)
// =============================================================================
const getAllOrders = async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        r.id AS request_id, r.title AS request_title, r.status AS request_status, r.created_at AS request_date,
        u.name AS customer, d.name AS device,
        ai.ai_diagnosis AS aiAnalysis, ai.estimated_price AS aiEstimatedPrice,
        s.store_name AS store,
        o.id AS order_id, o.status AS order_status, o.final_price AS total, (o.final_price * 0.1) AS commission
      FROM repair_requests r
      LEFT JOIN devices d ON r.device_id = d.id
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN ai_diagnosis_logs ai ON ai.device_id = d.id AND ai.user_id = r.user_id
      LEFT JOIN orders o ON o.request_id = r.id
      LEFT JOIN stores s ON o.store_id = s.id
      ORDER BY r.created_at DESC
    `);

    const formatData = rows.map(row => ({
      id: row.order_id ? `ORD-${String(row.order_id).padStart(4, '0')}` : `REQ-${String(row.request_id).padStart(4, '0')}`,
      customer: row.customer || 'Khách vãng lai',
      device: row.device || 'Không rõ thiết bị',
      title: row.request_title,
      date: new Date(row.request_date).toLocaleString('vi-VN'),
      aiAnalysis: row.aiAnalysis || 'Hệ thống đang phân tích...',
      aiEstimatedPrice: row.aiEstimatedPrice ? `${Number(row.aiEstimatedPrice).toLocaleString('vi-VN')}đ` : 'Chưa có',
      store: row.store || 'Đang chờ cửa hàng nhận',
      status: row.order_status || row.request_status || 'OPEN',
      total: Number(row.total) || 0,
      commission: Number(row.commission) || 0,
      timeline: [
        { step: 'AI Phân Tích', time: '1 phút', detail: 'Hệ thống quét ảnh', completed: row.aiAnalysis !== null },
        { step: 'Khách Đặt Yêu Cầu', time: 'Hoàn tất', detail: 'Phát yêu cầu tới thợ', completed: true },
        { step: 'Đang Sửa Chữa', time: '---', detail: 'Thợ đang nhận việc', completed: row.order_status === 'IN_PROGRESS' || row.order_status === 'COMPLETED' },
        { step: 'Hoàn Thành', time: '---', detail: 'Bàn giao cho khách', completed: row.order_status === 'COMPLETED' }
      ]
    }));
    res.status(200).json(formatData);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// =============================================================================
// 3. NGƯỜI DÙNG & ĐỐI TÁC
// =============================================================================
const getUsersAndPartners = async (req, res) => {
  try {
    const statsRows = await query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS totalUsers,
        (SELECT COUNT(*) FROM users WHERE role = 'STORE') AS totalPartners,
        (SELECT COUNT(*) FROM stores WHERE status = 'approved') AS activeStores,
        (SELECT COUNT(*) FROM store_subscriptions WHERE end_date IS NULL OR end_date >= CURDATE()) AS premiumSubscriptions
    `);

    const storeRows = await query(`
      SELECT
        s.id AS storeId, s.store_name AS name, s.google_rating AS rating, s.status, s.created_at,
        u.name AS owner, u.email, u.phone,
        (SELECT COUNT(*) FROM reviews WHERE store_id = s.id) AS reviews,
        (SELECT COUNT(*) FROM orders WHERE store_id = s.id) AS total_orders,
        sub.name AS packageName, ss.end_date AS packageExpiry
      FROM stores s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN store_subscriptions ss ON ss.store_id = s.id AND (ss.end_date IS NULL OR ss.end_date >= CURDATE())
      LEFT JOIN subscriptions sub ON ss.subscription_id = sub.id
      WHERE s.status IN ('approved')
      ORDER BY s.created_at DESC
    `);

    const userRows = await query(`
      SELECT
        u.id, u.name, u.email, u.phone, u.status, u.created_at,
        (SELECT COUNT(*) FROM repair_requests WHERE user_id = u.id) AS totalRequests
      FROM users u
      WHERE u.role = 'USER' OR u.role IS NULL
      ORDER BY u.created_at DESC
    `);

    const storesList = storeRows.map(store => ({
      id: `ST-${String(store.storeId).padStart(3, '0')}`,
      name: store.name,
      owner: store.owner,
      email: store.email,
      phone: store.phone || 'Chưa cập nhật',
      rating: Number(store.rating) || 5.0,
      reviews: Number(store.reviews) || 0,
      totalOrders: Number(store.total_orders) || 0,
      package: store.packageName || "Miễn Phí (Cơ Bản)",
      packageExpiry: store.packageExpiry ? new Date(store.packageExpiry).toLocaleDateString('vi-VN') : "Vô hạn",
      status: store.status === 'approved' ? 'Active' : 'Pending',
      joinedAt: new Date(store.created_at).toLocaleDateString('vi-VN')
    }));

    const usersList = userRows.map(user => ({
      id: `US-${String(user.id).padStart(3, '0')}`,
      name: user.name,
      email: user.email,
      phone: user.phone || 'Chưa cập nhật',
      status: user.status || 'ACTIVE',
      totalRequests: Number(user.totalRequests) || 0,
      joinedAt: new Date(user.created_at).toLocaleDateString('vi-VN')
    }));

    res.status(200).json({
      stats: statsRows[0] || { totalUsers: 0, totalPartners: 0, activeStores: 0, premiumSubscriptions: 0 },
      storesList,
      usersList
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// =============================================================================
// 4. BÁO CÁO DOANH THU
// =============================================================================
const getRevenueStats = async (req, res) => {
  try {
    const ordersResult = await query(`SELECT COALESCE(SUM(final_price * 0.1), 0) AS totalCommission FROM orders WHERE status = 'COMPLETED'`);
    const ordersRows = ordersResult[0] || { totalCommission: 0 };

    const paymentsResult = await query(`SELECT COALESCE(SUM(amount), 0) AS totalPremium FROM payments WHERE status = 'PAID'`);
    const paymentsRows = paymentsResult[0] || { totalPremium: 0 };

    // Vì bảng orders không có created_at, JOIN với repair_requests để lấy ngày tạo
    const weekRows = await query(`
      SELECT DATE_FORMAT(r.created_at, '%d/%m') AS name,
             COUNT(o.id) AS count,
             COALESCE(SUM(o.final_price * 0.1), 0) AS commission
      FROM orders o
      JOIN repair_requests r ON o.request_id = r.id
      WHERE o.status = 'COMPLETED' AND r.created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(r.created_at)
      ORDER BY DATE(r.created_at) ASC;
    `);

    const chartData = weekRows.length > 0 ? weekRows.map(r => ({
      name: r.name, premium: 0, commission: Number(r.commission)
    })) : [
      { name: 'T2', premium: 0, commission: 0 },
      { name: 'T3', premium: 0, commission: 0 },
      { name: 'T4', premium: 0, commission: 0 }
    ];

    res.status(200).json({
      totalCommission: Number(ordersRows.totalCommission),
      totalPremium: Number(paymentsRows.totalPremium),
      totalProfit: Number(ordersRows.totalCommission) + Number(paymentsRows.totalPremium),
      chartData: chartData
    });
  } catch (error) { 
    console.error("GET REVENUE ERROR:", error);
    res.status(500).json({ error: error.message }); 
  }
};

// =============================================================================
// 5. GÓI DỊCH VỤ PREMIUM
// =============================================================================
const getPackages = async (req, res) => {
  try {
    const rows = await query(`
      SELECT id, name, price, job_delay_minutes,
      (SELECT COUNT(*) FROM store_subscriptions WHERE subscription_id = subscriptions.id AND (end_date IS NULL OR end_date >= CURDATE())) AS activeStores
      FROM subscriptions
    `);
    
    const formatData = rows.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      price: pkg.price == 0 ? "Miễn phí" : `${Number(pkg.price).toLocaleString()}đ`,
      jobDelayMinutes: pkg.job_delay_minutes,
      delayLabel: pkg.job_delay_minutes == 0 ? "Nhận việc lập tức" : `Độ trễ AI ${pkg.job_delay_minutes} phút`,
      isPremium: pkg.price > 0,
      activeStores: Number(pkg.activeStores) || 0
    }));

    res.status(200).json(formatData);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

module.exports = {
  getPendingStores,
  approveStore,
  rejectStore,
  getAllOrders,
  getUsersAndPartners,
  getRevenueStats,
  getPackages
};