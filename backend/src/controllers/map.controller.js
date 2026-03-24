const db = require("../config/db");

// 📍 Tìm store gần nhất (dùng nội bộ)
const findNearestStore = (lat, lng) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT id, user_id, store_name,
      (
        6371 * acos(
          cos(radians(?)) *
          cos(radians(latitude)) *
          cos(radians(longitude) - radians(?)) +
          sin(radians(?)) *
          sin(radians(latitude))
        )
      ) AS distance
      FROM stores
      WHERE status = 'approved'
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      ORDER BY distance ASC
      LIMIT 1
    `;

    db.query(query, [lat, lng, lat], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]); // store gần nhất
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
    FROM stores
    WHERE status = 'approved'
    HAVING distance < 20
    ORDER BY distance ASC
    LIMIT 20
  `;

  db.query(query, [lat, lng, lat], (err, results) => {
    if (err) return res.status(500).json(err);
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
  findNearestStore, // 🔥 export để dùng chỗ khác
};