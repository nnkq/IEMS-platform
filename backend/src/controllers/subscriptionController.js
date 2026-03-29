const db = require('../config/db');

// Tên gói -> subscription_id tương ứng trong bảng subscriptions
// Nếu chưa có data mẫu, script sẽ tự insert khi cần
const PACKAGE_MAP = {
  VERIFIED: { name: 'VERIFIED', price: 500000, job_delay_minutes: 30 },
  PREMIUM:  { name: 'PREMIUM',  price: 1000000, job_delay_minutes: 0  },
  FREE:     { name: 'FREE',     price: 0,       job_delay_minutes: 60 },
};

// Helper: tìm hoặc tạo subscription record theo tên gói
const getOrCreateSubscriptionId = (packageName, cb) => {
  const pkg = PACKAGE_MAP[packageName] || PACKAGE_MAP['FREE'];
  db.query('SELECT id FROM subscriptions WHERE name = ? LIMIT 1', [pkg.name], (err, rows) => {
    if (err) return cb(err);
    if (rows.length > 0) return cb(null, rows[0].id);
    db.query(
      'INSERT INTO subscriptions (name, price, job_delay_minutes) VALUES (?, ?, ?)',
      [pkg.name, pkg.price, pkg.job_delay_minutes],
      (insErr, result) => {
        if (insErr) return cb(insErr);
        cb(null, result.insertId);
      }
    );
  });
};

// Helper: lấy store_id từ user_id
const getStoreIdByUserId = (userId, cb) => {
  db.query('SELECT id FROM stores WHERE user_id = ? LIMIT 1', [userId], (err, rows) => {
    if (err) return cb(err);
    cb(null, rows.length > 0 ? rows[0].id : null);
  });
};

// 1. Lấy gói đăng ký hiện tại của cửa hàng (theo userId)
exports.getSubscription = (req, res) => {
  const userId = req.params.userId;

  getStoreIdByUserId(userId, (err, storeId) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!storeId) return res.status(200).json(null);

    const sql = `
      SELECT ss.*, s.name AS package_name, s.price, s.job_delay_minutes
      FROM store_subscriptions ss
      INNER JOIN subscriptions s ON s.id = ss.subscription_id
      WHERE ss.store_id = ?
        AND ss.end_date >= CURDATE()
      ORDER BY ss.end_date DESC
      LIMIT 1
    `;
    db.query(sql, [storeId], (queryErr, results) => {
      if (queryErr) return res.status(500).json({ error: queryErr.message });
      res.status(200).json(results.length > 0 ? results[0] : null);
    });
  });
};

// 2. Nâng cấp / đăng ký gói mới
exports.upgradeSubscription = (req, res) => {
  const { userId, packageName, durationDays } = req.body;

  if (!userId || !packageName) {
    return res.status(400).json({ error: 'Thiếu userId hoặc packageName' });
  }

  getStoreIdByUserId(userId, (err, storeId) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!storeId) return res.status(404).json({ error: 'Không tìm thấy cửa hàng của user này' });

    getOrCreateSubscriptionId(packageName, (subErr, subscriptionId) => {
      if (subErr) return res.status(500).json({ error: subErr.message });

      const days = durationDays || 30;
      const startDate = new Date().toISOString().slice(0, 10);
      const endDateObj = new Date();
      endDateObj.setDate(endDateObj.getDate() + days);
      const endDate = endDateObj.toISOString().slice(0, 10);

      // Kiểm tra đã có gói chưa
      db.query('SELECT id FROM store_subscriptions WHERE store_id = ? LIMIT 1', [storeId], (selErr, selRows) => {
        if (selErr) return res.status(500).json({ error: selErr.message });

        if (selRows.length > 0) {
          // Đã có -> cập nhật
          const updateSql = `
            UPDATE store_subscriptions
            SET subscription_id = ?, start_date = ?, end_date = ?
            WHERE store_id = ?
          `;
          db.query(updateSql, [subscriptionId, startDate, endDate, storeId], (updateErr) => {
            if (updateErr) return res.status(500).json({ error: updateErr.message });
            res.status(200).json({ message: 'Nâng cấp gói thành công!', package_name: packageName });
          });
        } else {
          // Chưa có -> tạo mới
          const insertSql = `
            INSERT INTO store_subscriptions (store_id, subscription_id, start_date, end_date)
            VALUES (?, ?, ?, ?)
          `;
          db.query(insertSql, [storeId, subscriptionId, startDate, endDate], (insErr) => {
            if (insErr) return res.status(500).json({ error: insErr.message });
            res.status(201).json({ message: 'Đăng ký gói thành công!', package_name: packageName });
          });
        }
      });
    });
  });
};
