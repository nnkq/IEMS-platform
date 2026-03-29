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
    // ✅ CHECK LOGIN
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập hoặc token không hợp lệ',
      });
    }

    const user_id = req.user.id;

    // 🔥 NHẬN FULL DATA
    const {
      device_id, title, description, budget, location,
      latitude, longitude, phone, desired_date, service_mode,
      device_type, brand, model, symptoms
    } = req.body;

    // ✅ CHUẨN HÓA DATA
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

    // ❗ VALIDATE
    if (!cleanTitle || !cleanDescription) {
      return res.status(400).json({ message: "Thiếu tiêu đề hoặc mô tả" });
    }

    if (cleanLatitude === null || cleanLongitude === null) {
      return res.status(400).json({ message: "Thiếu vị trí" });
    }

    let finalDeviceId = null;
    if (cleanDeviceId !== null) {
      const deviceRows = await queryAsync("SELECT id FROM devices WHERE id = ? LIMIT 1", [cleanDeviceId]);
      if (deviceRows.length > 0) finalDeviceId = cleanDeviceId;
    }

    // ==========================================================
    // 🧠 TÌM STORE GẦN NHẤT để tạo quote auto
    // ==========================================================
    let nearestStore = null;
    try {
      nearestStore = await findNearestStore(cleanLatitude, cleanLongitude);
    } catch (findErr) {
      console.error("Find nearest store error:", findErr);
    }

    let finalStoreId = nearestStore ? nearestStore.id : null;
    if (!finalStoreId) {
      const fallbackStores = await queryAsync("SELECT id FROM stores LIMIT 1");
      finalStoreId = fallbackStores.length > 0 ? fallbackStores[0].id : null;
    }
    // ==========================================================

    // 📝 INSERT dùng đúng cột của DB
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
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', NOW())
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

    const safeDistance = Number(nearestStore?.distance || 0);
    const distanceText = safeDistance.toFixed(2);

    // 💰 TẠO QUOTE AUTO (gán store gần nhất nếu có)
    try {
      if (finalStoreId) {
        const quoteSql = `INSERT INTO quotes (request_id, store_id, status) VALUES (?, ?, 'PENDING')`;
        await queryAsync(quoteSql, [requestId, finalStoreId]);
      }
    } catch (quoteErr) {
      console.error('Insert quote error:', quoteErr);
    }

    // 🔔 NOTIFICATION
    try {
      if (nearestStore && nearestStore.user_id) {
        const notifySql = `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'SYSTEM')`;
        await queryAsync(notifySql, [
          nearestStore.user_id,
          "Job mới",
          `Có yêu cầu sửa chữa gần bạn (~${distanceText} km)`
        ]);
      }
    } catch (notifyErr) {
      console.error('Insert notification error:', notifyErr);
    }

    // ✅ RESPONSE
    return res.status(201).json({
      success: true,
      message: 'Tạo yêu cầu thành công',
      request_id: requestId,
      assigned_store: nearestStore ? nearestStore.store_name : null,
      distance_km: Number(distanceText)
    });
  } catch (error) {
    console.error("Create request error:", error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.sqlMessage || error.message || 'Unknown error',
    });
  }
};



// Lấy danh sách yêu cầu của một User (dành cho User Portal)
exports.getMyRepairRequests = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT *
    FROM repair_requests 
    WHERE user_id = ?
    ORDER BY created_at DESC, id DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('getMyRepairRequests error:', err);
      return res.status(500).json({ error: 'Lỗi lấy danh sách yêu cầu' });
    }
    
    const mappedRequests = results.map(row => {
      return {
        id: row.id,
        status: row.status,
        created_at: row.created_at,
        title: row.title || "Yêu cầu sửa chữa",
        description: row.description || "",
        budget: row.budget || "",
        location: row.location || "",
        device_name: `${row.brand || ''} ${row.model || ''}`.trim() || row.device_type || "Thiết bị chưa rõ",
        device_category: row.device_type || 'Chưa phân loại'
      };
    });

    res.json({ requests: mappedRequests });
  });
};
//lấy danh sách chi tiết từng repair request
// Lấy danh sách chi tiết từng repair request (Đã sửa chuẩn API Express)
exports.getRepairRequestsDetail = async (req, res) => {
  try {
    const requestId = req.params.id; // Lấy ID từ URL (VD: /api/repair-requests/1)
    
    const sql = `SELECT * FROM repair_requests WHERE id = ?`;
    const [rows] = await db.promise().query(sql, [requestId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu này" });
    }

    return res.status(200).json({ 
      success: true, 
      data: rows[0] 
    });

  } catch (error) {
    console.error("Lỗi getRepairRequestsDetail:", error);
    return res.status(500).json({ success: false, message: "Lỗi server", error: error.message });
  }
};
// ======================================================================
// --- BẮT ĐẦU PHẦN MỚI: XỬ LÝ TIẾN ĐỘ SỬA CHỮA ---
// ======================================================================

// 1. Hàm lấy danh sách các yêu cầu ĐANG SỬA CHỮA (để đổ ra bảng ở Frontend)
exports.getOngoingRepairs = async (req, res) => {
    try {
        const storeId = req.query.storeId; 

        if (!storeId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp storeId.' 
            });
        }

        const query = `
            SELECT id, user_id, title, brand, model, device_type, status
            FROM repair_requests
            WHERE user_id = ? AND status = 'IN_PROGRESS'
        `;

        const [rows] = await db.promise().query(query, [storeId]);

        return res.status(200).json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Lỗi khi lấy danh sách máy đang sửa:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Đã xảy ra lỗi server khi lấy dữ liệu.',
            error: error.message 
        });
    }
};

// 2. Hàm Cập nhật trạng thái (Dùng khi bấm nút "Báo hoàn thành")
exports.updateRepairProgress = async (req, res) => {
    try {
        const requestId = req.params.id; 
        const { status } = req.body; 

        if (!status) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp trạng thái cần cập nhật.' 
            });
        }

        const updateQuery = `UPDATE repair_requests SET status = ? WHERE id = ?`;
        
        const [result] = await db.promise().query(updateQuery, [status, requestId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy yêu cầu sửa chữa này.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật tiến độ thành công!'
        });

    } catch (error) {
        console.error('Lỗi khi cập nhật tiến độ:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi server khi cập nhật tiến độ.',
            error: error.message 
        });
    }
};
// ============================================================
// 🚀 PHẦN THÊM MỚI CHO STORE PORTAL (TIẾN ĐỘ SỬA CHỮA)
// ============================================================

exports.getStoreRequests = (req, res) => {
    const sql = 'SELECT * FROM repair_requests ORDER BY created_at DESC';
    
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
};

exports.updateRequestStatus = (req, res) => {
    const requestId = req.params.id;
    const { status } = req.body; 

    db.query('UPDATE repair_requests SET status = ? WHERE id = ?', [status, requestId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        if (status === 'COMPLETED') {
            db.query('SELECT user_id, brand, model, device_type FROM repair_requests WHERE id = ?', [requestId], (selErr, selRes) => {
                if (!selErr && selRes.length > 0) {
                    const customerId = selRes[0].user_id;
                    const deviceName = `${selRes[0].brand || ''} ${selRes[0].model || ''}`.trim() || selRes[0].device_type || "Thiết bị";
                    const message = `🎉 Tuyệt vời! Thiết bị ${deviceName} của bạn đã được sửa chữa hoàn thành. Cửa hàng đang đợi bạn đến nhận máy!`;

                    db.query('INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, "SYSTEM")', 
                    [customerId, "Sửa chữa hoàn tất", message], (insErr) => {
                        if (insErr) console.error("Lỗi tạo thông báo:", insErr);
                    });
                }
            });
        }
        res.status(200).json({ message: 'Đã cập nhật tiến độ!' });
    });
};

exports.deleteRequest = (req, res) => {
    const requestId = req.params.id;
    db.query('DELETE FROM repair_requests WHERE id = ?', [requestId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Đã từ chối đơn hàng' });
    });
};