const db = require("../config/db");

//
// Helper chạy query Promise
//
const queryAsync = (sql, values = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

//
// Chuẩn hóa số
//
const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

//
// Chuẩn hóa string
//
const toStringOrNull = (value) => {
  if (value === undefined || value === null) return null;
  const v = String(value).trim();
  return v === "" ? null : v;
};

//
// 🧠 TÌM STORE GẦN NHẤT
//
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

//
// 🔧 CREATE REQUEST FULL
//
exports.createRepairRequest = async (req, res) => {
  try {
    //
    // ✅ CHECK LOGIN
    //
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Bạn chưa đăng nhập hoặc token không hợp lệ"
      });
    }

    const user_id = req.user.id;

    //
    // 🔥 NHẬN FULL DATA
    //
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
      symptoms
    } = req.body;

    //
    // ✅ CHUẨN HÓA DATA
    //
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
      ? symptoms.map((x) => String(x).trim()).filter(Boolean).join(", ")
      : toStringOrNull(symptoms);

    const cleanLatitude = toNumberOrNull(latitude);
    const cleanLongitude = toNumberOrNull(longitude);
    const cleanBudget = toNumberOrNull(budget);
    const cleanDeviceId = toNumberOrNull(device_id);

    //
    // ❗ VALIDATE
    //
    if (!cleanTitle || !cleanDescription) {
      return res.status(400).json({
        message: "Thiếu tiêu đề hoặc mô tả"
      });
    }

    if (cleanLatitude === null || cleanLongitude === null) {
      return res.status(400).json({
        message: "Thiếu vị trí"
      });
    }

    //
    // ✅ CHECK device_id nếu có truyền lên
    // tránh lỗi foreign key khi frontend hard-code device_id = 1
    //
    let finalDeviceId = null;

    if (cleanDeviceId !== null) {
      const deviceRows = await queryAsync(
        "SELECT id FROM devices WHERE id = ? LIMIT 1",
        [cleanDeviceId]
      );

      if (deviceRows.length > 0) {
        finalDeviceId = cleanDeviceId;
      } else {
        finalDeviceId = null;
      }
    }

    //
    // 📝 INSERT REQUEST
    //
    const insertSql = `
      INSERT INTO repair_requests
      (
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
      user_id,
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
      cleanSymptoms
    ];

    const result = await queryAsync(insertSql, insertValues);
    const requestId = result.insertId;

    //
    // 🔍 TÌM STORE GẦN NHẤT
    //
    let nearestStore = null;

    try {
      nearestStore = await findNearestStore(cleanLatitude, cleanLongitude);
    } catch (findErr) {
      console.error("Find nearest store error:", findErr);
    }

    //
    // ❗ KHÔNG CÓ STORE
    //
    if (!nearestStore) {
      return res.status(201).json({
        success: true,
        message: "Tạo request thành công nhưng chưa có store phù hợp",
        request_id: requestId
      });
    }

    const safeDistance = Number(nearestStore.distance || 0);
    const distanceText = safeDistance.toFixed(2);

    //
    // 💰 TẠO QUOTE AUTO
    // có lỗi cũng không làm fail request chính
    //
    try {
      const quoteSql = `
        INSERT INTO quotes (request_id, store_id, status)
        VALUES (?, ?, 'PENDING')
      `;
      await queryAsync(quoteSql, [requestId, nearestStore.id]);
    } catch (quoteErr) {
      console.error("Insert quote error:", quoteErr);
    }

    //
    // 🔔 NOTIFICATION
    // có lỗi cũng không làm fail request chính
    //
    try {
      if (nearestStore.user_id) {
        const notifySql = `
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, 'SYSTEM')
        `;

        await queryAsync(notifySql, [
          nearestStore.user_id,
          "Job mới",
          `Có yêu cầu sửa chữa gần bạn (~${distanceText} km)`
        ]);
      }
    } catch (notifyErr) {
      console.error("Insert notification error:", notifyErr);
    }

    //
    // ✅ RESPONSE
    //
    return res.status(201).json({
      success: true,
      message: "Tạo yêu cầu thành công",
      request_id: requestId,
      assigned_store: nearestStore.store_name || null,
      distance_km: Number(distanceText)
    });
  } catch (error) {
    console.error("Create request error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.sqlMessage || error.message || "Unknown error"
    });
  }
};



exports.getMyRepairRequests = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Bạn chưa đăng nhập" });
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
        d.name AS device_name,
        d.category AS device_category
      FROM repair_requests rr
      LEFT JOIN devices d ON rr.device_id = d.id
      WHERE rr.user_id = ?
      ORDER BY rr.created_at DESC, rr.id DESC
    `;

    const rows = await queryAsync(sql, [userId]);

    return res.json({
      success: true,
      requests: rows
    });
  } catch (error) {
    console.error("getMyRepairRequests error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy danh sách yêu cầu",
      error: error.sqlMessage || error.message
    });
  }
};