const db = require("../config/db");

const premiumFlagSql = `
  EXISTS(
    SELECT 1
    FROM store_subscriptions ss
    INNER JOIN subscriptions sub ON sub.id = ss.subscription_id
    WHERE ss.store_id = stores.id
      AND (ss.end_date IS NULL OR ss.end_date >= CURDATE())
      AND sub.name = 'PREMIUM'
  ) AS is_premium_partner
`;

const verifiedFlagSql = `
  EXISTS(
    SELECT 1
    FROM store_subscriptions ss
    INNER JOIN subscriptions sub ON sub.id = ss.subscription_id
    WHERE ss.store_id = stores.id
      AND (ss.end_date IS NULL OR ss.end_date >= CURDATE())
      AND sub.name IN ('VERIFIED', 'PREMIUM')
  ) AS has_verified_badge
`;

const packageNameSql = `
  (
    SELECT sub.name
    FROM store_subscriptions ss
    INNER JOIN subscriptions sub ON sub.id = ss.subscription_id
    WHERE ss.store_id = stores.id
      AND (ss.end_date IS NULL OR ss.end_date >= CURDATE())
    ORDER BY COALESCE(ss.end_date, '9999-12-31') DESC, ss.id DESC
    LIMIT 1
  ) AS package_name
`;

// 📍 Tìm store gần nhất (dùng nội bộ)
const findNearestStore = (lat, lng) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        stores.id,
        stores.user_id,
        stores.store_name,
        ${packageNameSql},
        ${premiumFlagSql},
        ${verifiedFlagSql},
        (
          6371 * acos(
            cos(radians(?)) *
            cos(radians(stores.latitude)) *
            cos(radians(stores.longitude) - radians(?)) +
            sin(radians(?)) *
            sin(radians(stores.latitude))
          )
        ) AS distance
      FROM stores
      WHERE stores.status = 'approved'
        AND stores.latitude IS NOT NULL
        AND stores.longitude IS NOT NULL
      ORDER BY is_premium_partner DESC, distance ASC, stores.google_rating DESC
      LIMIT 1
    `;

    db.query(query, [lat, lng, lat], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]); // store gần nhất, ưu tiên PREMIUM
    });
  });
};

// 📍 API: user tìm store gần
const getNearbyStores = (req, res) => {
  const { lat, lng } = req.body;

  if (!lat || !lng) {
    return res.status(400).json({ message: "Thiếu tọa độ" });
  }

  const query = `
    SELECT
      stores.*,
      ${packageNameSql},
      ${premiumFlagSql},
      ${verifiedFlagSql},
      (
        6371 * acos(
          cos(radians(?)) *
          cos(radians(stores.latitude)) *
          cos(radians(stores.longitude) - radians(?)) +
          sin(radians(?)) *
          sin(radians(stores.latitude))
        )
      ) AS distance
    FROM stores
    WHERE stores.status = 'approved'
      AND stores.latitude IS NOT NULL
      AND stores.longitude IS NOT NULL
    HAVING distance < 20
    ORDER BY is_premium_partner DESC, distance ASC, stores.google_rating DESC
    LIMIT 20
  `;

  db.query(query, [lat, lng, lat], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(results);
  });
};

// 📍 API: store tìm request gần
const getNearbyRequests = (req, res) => {
  const { lat, lng } = req.body;

  const query = `
    SELECT *,
    (
      6371 * acos(
        cos(radians(?)) *
        cos(radians(latitude)) *
        cos(radians(longitude) - radians(?)) +
        sin(radians(?)) *
        sin(radians(latitude))
      )
    ) AS distance
    FROM repair_requests
    WHERE status = 'OPEN'
    HAVING distance < 20
    ORDER BY distance ASC
    LIMIT 20
  `;

  db.query(query, [lat, lng, lat], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
};

module.exports = {
  getNearbyStores,
  getNearbyRequests,
  findNearestStore,
};
