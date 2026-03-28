const db = require('../config/db');

const queryAsync = (sql, values = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

const toStringOrNull = (value) => {
  if (value === undefined || value === null) return null;
  const clean = String(value).trim();
  return clean === '' ? null : clean;
};

const findNearestStore = async (lat, lng) => {
  const query = `
    SELECT
      id,
      user_id,
      store_name,
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
    ORDER BY distance ASC, google_rating DESC
    LIMIT 1
  `;

  const results = await queryAsync(query, [lat, lng, lat]);
  return results[0] || null;
};

const resolveDeviceId = async ({ deviceId, deviceType, brand, model }) => {
  if (deviceId !== null) {
    const existingRows = await queryAsync(
      'SELECT id FROM devices WHERE id = ? LIMIT 1',
      [deviceId]
    );

    if (existingRows.length > 0) {
      return deviceId;
    }
  }

  const candidates = [
    [brand, model].filter(Boolean).join(' ').trim(),
    model,
    [deviceType, brand, model].filter(Boolean).join(' ').trim(),
    brand,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const rows = await queryAsync(
      `
      SELECT id
      FROM devices
      WHERE LOWER(name) = LOWER(?)
         OR LOWER(name) LIKE LOWER(?)
      ORDER BY CASE WHEN LOWER(name) = LOWER(?) THEN 0 ELSE 1 END, id ASC
      LIMIT 1
      `,
      [candidate, `%${candidate}%`, candidate]
    );

    if (rows.length > 0) {
      return rows[0].id;
    }
  }

  return null;
};

exports.createRepairRequest = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập hoặc token không hợp lệ',
      });
    }

    const userId = req.user.id;
    const {
      device_id,
      title,
      description,
      budget,
      location,
      latitude,
      longitude,
      phone,
      desired_date,
      service_mode,
      device_type,
      brand,
      model,
      symptoms,
    } = req.body;

    const cleanTitle = toStringOrNull(title);
    const cleanDescription = toStringOrNull(description);
    const cleanLocation = toStringOrNull(location);
    const cleanPhone = toStringOrNull(phone);
    const cleanDesiredDate = toStringOrNull(desired_date);
    const cleanServiceMode = toStringOrNull(service_mode);
    const cleanDeviceType = toStringOrNull(device_type);
    const cleanBrand = toStringOrNull(brand);
    const cleanModel = toStringOrNull(model);
    const cleanSymptoms = Array.isArray(symptoms)
      ? symptoms.map((item) => String(item).trim()).filter(Boolean).join(', ')
      : toStringOrNull(symptoms);

    const cleanLatitude = toNumberOrNull(latitude);
    const cleanLongitude = toNumberOrNull(longitude);
    const cleanBudget = toNumberOrNull(budget);
    const cleanDeviceId = toNumberOrNull(device_id);

    if (!cleanTitle || !cleanDescription) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu tiêu đề hoặc mô tả',
      });
    }

    if (cleanLatitude === null || cleanLongitude === null) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu vị trí',
      });
    }

    const finalDeviceId = await resolveDeviceId({
      deviceId: cleanDeviceId,
      deviceType: cleanDeviceType,
      brand: cleanBrand,
      model: cleanModel,
    });

    const insertSql = `
      INSERT INTO repair_requests (
        user_id,
        device_id,
        title,
        description,
        budget,
        location,
        latitude,
        longitude,
        phone,
        desired_date,
        service_mode,
        device_type,
        brand,
        model,
        symptoms,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')
    `;

    const insertValues = [
      userId,
      finalDeviceId,
      cleanTitle,
      cleanDescription,
      cleanBudget,
      cleanLocation,
      cleanLatitude,
      cleanLongitude,
      cleanPhone,
      cleanDesiredDate,
      cleanServiceMode,
      cleanDeviceType,
      cleanBrand,
      cleanModel,
      cleanSymptoms,
    ];

    const result = await queryAsync(insertSql, insertValues);
    const requestId = result.insertId;

    let nearestStore = null;

    try {
      nearestStore = await findNearestStore(cleanLatitude, cleanLongitude);
    } catch (findErr) {
      console.error('Find nearest store error:', findErr);
    }

    if (!nearestStore) {
      return res.status(201).json({
        success: true,
        message: 'Tạo request thành công nhưng chưa có store phù hợp',
        request_id: requestId,
      });
    }

    const safeDistance = Number(nearestStore.distance || 0);
    const distanceText = safeDistance.toFixed(2);

    try {
      await queryAsync(
        `
        INSERT INTO quotes (request_id, store_id, status)
        VALUES (?, ?, 'PENDING')
        `,
        [requestId, nearestStore.id]
      );
    } catch (quoteErr) {
      console.error('Insert quote error:', quoteErr);
    }

    try {
      if (nearestStore.user_id) {
        await queryAsync(
          `
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, 'SYSTEM')
          `,
          [
            nearestStore.user_id,
            'Job mới',
            `Có yêu cầu sửa chữa gần bạn (~${distanceText} km)`,
          ]
        );
      }
    } catch (notifyErr) {
      console.error('Insert notification error:', notifyErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Tạo yêu cầu thành công',
      request_id: requestId,
      assigned_store: nearestStore.store_name || null,
      distance_km: Number(distanceText),
      matched_device_id: finalDeviceId,
    });
  } catch (error) {
    console.error('Create request error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.sqlMessage || error.message || 'Unknown error',
    });
  }
};

exports.getMyRepairRequests = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập',
      });
    }

    const userId = req.user.id;

    const sql = `
      SELECT
        rr.id,
        rr.user_id,
        rr.device_id,
        rr.title,
        rr.description,
        rr.budget,
        rr.location,
        rr.latitude,
        rr.longitude,
        rr.status,
        rr.created_at,
        rr.phone,
        rr.desired_date,
        rr.service_mode,
        rr.device_type,
        rr.brand,
        rr.model,
        rr.symptoms,
        COALESCE(
          d.name,
          NULLIF(TRIM(CONCAT_WS(' ', rr.brand, rr.model)), ''),
          rr.device_type,
          'Thiết bị chưa rõ'
        ) AS device_name,
        COALESCE(sc.name, d.category, rr.device_type, 'Khác') AS device_category
      FROM repair_requests rr
      LEFT JOIN devices d ON rr.device_id = d.id
      LEFT JOIN service_categories sc ON sc.id = d.category_id
      WHERE rr.user_id = ?
      ORDER BY rr.created_at DESC, rr.id DESC
    `;

    const rows = await queryAsync(sql, [userId]);

    return res.json({
      success: true,
      requests: rows,
    });
  } catch (error) {
    console.error('getMyRepairRequests error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách yêu cầu',
      error: error.sqlMessage || error.message,
    });
  }
};