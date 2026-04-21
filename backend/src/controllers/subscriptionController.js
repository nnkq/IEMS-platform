const db = require('../config/db');

const PACKAGE_MAP = {
  VERIFIED: { name: 'VERIFIED', price: 500000, job_delay_minutes: 30 },
  PREMIUM: { name: 'PREMIUM', price: 1000000, job_delay_minutes: 0 },
  FREE: { name: 'FREE', price: 0, job_delay_minutes: 60 },
};

const getOrCreateSubscriptionId = (packageName, cb) => {
  const pkg = PACKAGE_MAP[packageName] || PACKAGE_MAP.FREE;

  db.query(
    'SELECT id FROM subscriptions WHERE name = ? LIMIT 1',
    [pkg.name],
    (err, rows) => {
      if (err) return cb(err);

      if (rows.length > 0) {
        return cb(null, rows[0].id, pkg);
      }

      db.query(
        'INSERT INTO subscriptions (name, price, job_delay_minutes) VALUES (?, ?, ?)',
        [pkg.name, pkg.price, pkg.job_delay_minutes],
        (insertErr, result) => {
          if (insertErr) return cb(insertErr);
          cb(null, result.insertId, pkg);
        }
      );
    }
  );
};

const getStoreByUserId = (userId, cb) => {
  db.query(
    'SELECT id, user_id, store_name FROM stores WHERE user_id = ? LIMIT 1',
    [userId],
    (err, rows) => {
      if (err) return cb(err);
      cb(null, rows.length > 0 ? rows[0] : null);
    }
  );
};

const getActivePackageByStoreId = (storeId, cb) => {
  const sql = `
    SELECT
      ss.*,
      s.name AS package_name,
      s.price,
      s.job_delay_minutes
    FROM store_subscriptions ss
    INNER JOIN subscriptions s ON s.id = ss.subscription_id
    WHERE ss.store_id = ?
      AND (ss.end_date IS NULL OR ss.end_date >= CURDATE())
    ORDER BY COALESCE(ss.end_date, '9999-12-31') DESC, ss.id DESC
    LIMIT 1
  `;

  db.query(sql, [storeId], (err, rows) => {
    if (err) return cb(err);
    cb(null, rows.length > 0 ? rows[0] : null);
  });
};

exports.getSubscription = (req, res) => {
  const userId = req.params.userId;

  getStoreByUserId(userId, (err, store) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!store) return res.status(200).json(null);

    getActivePackageByStoreId(store.id, (queryErr, activePackage) => {
      if (queryErr) return res.status(500).json({ error: queryErr.message });
      res.status(200).json(activePackage);
    });
  });
};

exports.upgradeSubscription = (req, res) => {
  const {
    userId,
    packageName,
    durationDays,
    paymentMethod,
    paymentType,
    isMockPayment,
  } = req.body;

  if (!userId || !packageName) {
    return res.status(400).json({ error: 'Thiếu userId hoặc packageName' });
  }

  const selectedPackage = PACKAGE_MAP[packageName];
  if (!selectedPackage) {
    return res.status(400).json({ error: 'Gói không hợp lệ' });
  }

  getStoreByUserId(userId, (storeErr, store) => {
    if (storeErr) return res.status(500).json({ error: storeErr.message });
    if (!store) {
      return res.status(404).json({ error: 'Không tìm thấy cửa hàng của user này' });
    }

    getOrCreateSubscriptionId(packageName, (subErr, subscriptionId, pkg) => {
      if (subErr) return res.status(500).json({ error: subErr.message });

      const days = Number(durationDays || 30);
      const startDate = new Date().toISOString().slice(0, 10);
      const endDateObj = new Date();
      endDateObj.setDate(endDateObj.getDate() + days);
      const endDate = endDateObj.toISOString().slice(0, 10);

      const method = paymentMethod || 'VNPAY';
      const type = paymentType || 'FULL';
      const transactionCode = `TEST-${packageName}-${Date.now()}`;
      const paymentStatus = isMockPayment === false ? 'PENDING' : 'PAID';

      const paymentSql = `
        INSERT INTO payments (
          order_id,
          user_id,
          store_id,
          amount,
          payment_method,
          payment_type,
          status,
          transaction_code
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        paymentSql,
        [null, userId, store.id, pkg.price, method, type, paymentStatus, transactionCode],
        (paymentErr, paymentResult) => {
          if (paymentErr) {
            return res.status(500).json({ error: paymentErr.message });
          }

          if (paymentStatus !== 'PAID') {
            return res.status(200).json({
              message: 'Đã tạo giao dịch chờ thanh toán',
              payment_id: paymentResult.insertId,
              package_name: packageName,
              payment_status: paymentStatus,
            });
          }

          db.query(
            'SELECT id FROM store_subscriptions WHERE store_id = ? LIMIT 1',
            [store.id],
            (selErr, selRows) => {
              if (selErr) {
                return res.status(500).json({ error: selErr.message });
              }

              const finishResponse = () => {
                db.query(
                  `INSERT INTO notifications (user_id, title, message, type)
                   VALUES (?, ?, ?, 'PAYMENT')`,
                  [
                    userId,
                    'Thanh toán gói quảng bá thành công',
                    `Cửa hàng của bạn đã thanh toán thành công gói ${packageName}. Mã giao dịch: ${transactionCode}.`,
                  ],
                  () => {
                    return res.status(200).json({
                      message: 'Thanh toán ảo thành công và đã nâng cấp gói!',
                      package_name: packageName,
                      payment_id: paymentResult.insertId,
                      payment_status: paymentStatus,
                      transaction_code: transactionCode,
                    });
                  }
                );
              };

              if (selRows.length > 0) {
                const updateSql = `
                  UPDATE store_subscriptions
                  SET subscription_id = ?, start_date = ?, end_date = ?
                  WHERE store_id = ?
                `;

                db.query(
                  updateSql,
                  [subscriptionId, startDate, endDate, store.id],
                  (updateErr) => {
                    if (updateErr) {
                      return res.status(500).json({ error: updateErr.message });
                    }
                    finishResponse();
                  }
                );
              } else {
                const insertSql = `
                  INSERT INTO store_subscriptions (store_id, subscription_id, start_date, end_date)
                  VALUES (?, ?, ?, ?)
                `;

                db.query(
                  insertSql,
                  [store.id, subscriptionId, startDate, endDate],
                  (insertSubErr) => {
                    if (insertSubErr) {
                      return res.status(500).json({ error: insertSubErr.message });
                    }
                    finishResponse();
                  }
                );
              }
            }
          );
        }
      );
    });
  });
};

exports.broadcastPromotion = (req, res) => {
  const userId = req.user?.id;
  const rawTitle = req.body?.title;
  const rawMessage = req.body?.message;

  const title = String(rawTitle || '').trim();
  const message = String(rawMessage || '').trim();

  if (!userId) {
    return res.status(401).json({ error: 'Bạn chưa đăng nhập' });
  }

  if (!title || !message) {
    return res.status(400).json({ error: 'Vui lòng nhập tiêu đề và nội dung ưu đãi' });
  }

  getStoreByUserId(userId, (storeErr, store) => {
    if (storeErr) return res.status(500).json({ error: storeErr.message });
    if (!store) {
      return res.status(404).json({ error: 'Không tìm thấy cửa hàng của bạn' });
    }

    getActivePackageByStoreId(store.id, (pkgErr, activePackage) => {
      if (pkgErr) return res.status(500).json({ error: pkgErr.message });

      if (!activePackage || activePackage.package_name !== 'PREMIUM') {
        return res.status(403).json({
          error: 'Chỉ gói PREMIUM mới được nhắn tin ưu đãi đến toàn bộ User',
        });
      }

      db.query(
        `
        SELECT id
        FROM users
        WHERE role = 'USER'
          AND (status IS NULL OR status <> 'BLOCKED')
        `,
        (userErr, users) => {
          if (userErr) return res.status(500).json({ error: userErr.message });

          if (!users.length) {
            return res.status(200).json({
              message: 'Không có user nào để gửi ưu đãi',
              recipients: 0,
            });
          }

          const values = users.map((user) => [
            user.id,
            userId,
            title,
            `[${store.store_name}] ${message}`,
            'SYSTEM',
          ]);

          db.query(
            `
            INSERT INTO notifications (user_id, sender_id, title, message, type)
            VALUES ?
            `,
            [values],
            (insertErr) => {
              if (insertErr) return res.status(500).json({ error: insertErr.message });

              return res.status(200).json({
                message: 'Đã gửi ưu đãi đến toàn bộ User thành công',
                recipients: users.length,
                store_name: store.store_name,
                package_name: activePackage.package_name,
              });
            }
          );
        }
      );
    });
  });
};
