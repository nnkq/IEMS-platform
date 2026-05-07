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

const packagePrioritySql = `
  (
    SELECT
      CASE
        WHEN sub.name = 'PREMIUM' THEN 2
        WHEN sub.name = 'VERIFIED' THEN 1
        ELSE 0
      END
    FROM store_subscriptions ss
    INNER JOIN subscriptions sub ON sub.id = ss.subscription_id
    WHERE ss.store_id = stores.id
      AND (ss.end_date IS NULL OR ss.end_date >= CURDATE())
    ORDER BY
      CASE
        WHEN sub.name = 'PREMIUM' THEN 2
        WHEN sub.name = 'VERIFIED' THEN 1
        ELSE 0
      END DESC,
      COALESCE(ss.end_date, '9999-12-31') DESC,
      ss.id DESC
    LIMIT 1
  ) AS package_priority
`;

const DEFAULT_RADIUS_KM = 20;
const MAX_RADIUS_KM = 50;

const toFiniteNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const clampRadius = (value, fallback = DEFAULT_RADIUS_KM) => {
  const radius = Number(value);

  if (!Number.isFinite(radius) || radius <= 0) {
    return fallback;
  }

  return Math.min(radius, MAX_RADIUS_KM);
};

const buildBoundingBox = (lat, lng, radiusKm) => {
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
};

// 📍 Tìm store gần nhất (dùng nội bộ)
const findNearestStore = (lat, lng) => {
  return new Promise((resolve, reject) => {
    const normalizedLat = toFiniteNumber(lat);
    const normalizedLng = toFiniteNumber(lng);

    if (normalizedLat === null || normalizedLng === null) {
      return reject(new Error("Thiếu tọa độ hợp lệ"));
    }

    const radiusKm = MAX_RADIUS_KM;
    const box = buildBoundingBox(normalizedLat, normalizedLng, radiusKm);

    const query = `
      SELECT
        stores.id,
        stores.user_id,
        stores.store_name,
        ${packageNameSql},
        ${packagePrioritySql},
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
        AND stores.latitude BETWEEN ? AND ?
        AND stores.longitude BETWEEN ? AND ?
      ORDER BY COALESCE(package_priority, 0) DESC, distance ASC, COALESCE(stores.google_rating, 0) DESC
      LIMIT 1
    `;

    db.query(
      query,
      [
        normalizedLat,
        normalizedLng,
        normalizedLat,
        box.minLat,
        box.maxLat,
        box.minLng,
        box.maxLng,
      ],
      (err, results) => {
        if (err) return reject(err);
        resolve(results[0] || null);
      }
    );
  });
};

// 📍 API: user tìm store gần
const getNearbyStores = (req, res) => {
  const lat = toFiniteNumber(req.body?.lat);
  const lng = toFiniteNumber(req.body?.lng);
  const radiusKm = clampRadius(req.body?.radiusKm);

  if (lat === null || lng === null) {
    return res.status(400).json({ message: "Thiếu tọa độ hợp lệ" });
  }

  const box = buildBoundingBox(lat, lng, radiusKm);

  const query = `
    SELECT
      stores.*,
      ${packageNameSql},
      ${packagePrioritySql},
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
      AND stores.latitude BETWEEN ? AND ?
      AND stores.longitude BETWEEN ? AND ?
    HAVING distance <= ?
    ORDER BY COALESCE(package_priority, 0) DESC, distance ASC, COALESCE(stores.google_rating, 0) DESC
    LIMIT 20
  `;

  db.query(
    query,
    [lat, lng, lat, box.minLat, box.maxLat, box.minLng, box.maxLng, radiusKm],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(results);
    }
  );
};

// 📍 API: store tìm request gần
const getNearbyRequests = (req, res) => {
  const lat = toFiniteNumber(req.body?.lat);
  const lng = toFiniteNumber(req.body?.lng);
  const radiusKm = clampRadius(req.body?.radiusKm);

  if (lat === null || lng === null) {
    return res.status(400).json({ message: "Thiếu tọa độ hợp lệ" });
  }

  const box = buildBoundingBox(lat, lng, radiusKm);

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
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND latitude BETWEEN ? AND ?
      AND longitude BETWEEN ? AND ?
    HAVING distance <= ?
    ORDER BY distance ASC
    LIMIT 20
  `;

  db.query(
    query,
    [lat, lng, lat, box.minLat, box.maxLat, box.minLng, box.maxLng, radiusKm],
    (err, results) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(results);
    }
  );
};

module.exports = {
  getNearbyStores,
  getNearbyRequests,
  findNearestStore,
};
