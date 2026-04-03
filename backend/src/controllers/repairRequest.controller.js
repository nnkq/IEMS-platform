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

    const userId = req.user.id;

    // 🔥 NHẬN FULL DATA (ĐÃ THÊM store_id VÀO ĐỂ NHẬN TỪ FRONTEND)
    const {
      store_id, // <-- CỘT MỚI: Khách hàng tự chọn Cửa hàng nào thì Frontend gửi ID đó xuống
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
    // 🧠 TÌM STORE GẦN NHẤT (ĐÃ COMMENT VÔ HIỆU HÓA VÌ KHÁCH ĐÃ TỰ CHỌN ĐÍCH DANH)
    // ==========================================================
    /*
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
    */
    // ==========================================================

    // 📝 INSERT dùng đúng cột của DB (ĐÃ THÊM store_id VÀO SQL)
    const insertSql = `
      INSERT INTO repair_requests (
        user_id,
        store_id, 
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', NOW())
    `;

    const insertValues = [
      userId, 
      store_id || null, // <-- TRUYỀN ID CỬA HÀNG KHÁCH CHỌN VÀO ĐÂY
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

    // Lấy thông tin cửa hàng khách vừa chọn để gửi thông báo (nếu có)
    let assignedStoreName = null;
    let assignedStoreUserId = null;

    if (store_id) {
        const storeInfo = await queryAsync("SELECT user_id, store_name FROM stores WHERE id = ?", [store_id]);
        if (storeInfo.length > 0) {
            assignedStoreName = storeInfo[0].store_name;
            assignedStoreUserId = storeInfo[0].user_id;
        }
    }

    // 💰 TẠO QUOTE AUTO (Vẫn đang được comment vô hiệu hóa như yêu cầu)
    // try { ... }

    // 🔔 NOTIFICATION (Đã sửa để bắn thông báo đúng cho chủ Cửa hàng khách chọn)
    try {
      if (assignedStoreUserId) {
        const notifySql = `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'SYSTEM')`;
        await queryAsync(notifySql, [
          assignedStoreUserId,
          "Job mới",
          `Khách hàng vừa gửi trực tiếp một yêu cầu sửa chữa đến cửa hàng của bạn!`
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
      assigned_store: assignedStoreName // Trả về tên cửa hàng đã nhận đơn
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



// Lấy danh sách yêu cầu của một User (dành cho User Portal) - ĐÃ THÊM 2 CỘT BÁO CÁO THỢ
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
        device_category: row.device_type || 'Chưa phân loại',
        // 🚀 THÊM 2 DÒNG NÀY ĐỂ GỬI BÁO CÁO CỦA THỢ LÊN FRONTEND
        technician_note: row.technician_note || null,
        extra_cost: row.extra_cost || 0
      };
    });

    res.json({ requests: mappedRequests });
  });
};

// Lấy danh sách chi tiết từng repair request - GIỮ NGUYÊN
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

        // ĐÃ FIX: Sửa user_id = ? thành store_id = ?
        const query = `
            SELECT id, user_id, title, brand, model, device_type, status
            FROM repair_requests
            WHERE store_id = ? AND status = 'IN_PROGRESS'
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

// 2. Hàm Cập nhật trạng thái (Dùng khi bấm nút "Báo hoàn thành") - GIỮ NGUYÊN
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
    const storeId = req.query.storeId; 

    if (!storeId) {
        return res.status(400).json({ error: "Thiếu storeId. Vui lòng truyền storeId trên URL (VD: ?storeId=1)" });
    }

    // 🚀 Dùng LEFT JOIN để móc tên thợ từ bảng employees lên
    const sql = `
        SELECT r.*, e.name as employee_name 
        FROM repair_requests r
        LEFT JOIN employees e ON r.employee_id = e.id
        WHERE r.store_id = ? 
        ORDER BY r.created_at DESC
    `;
    
    db.query(sql, [storeId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
};

// ============================================================
// 2. SỬA HÀM UPDATE: Lưu ID của thợ vào Database (Fix Ảnh 2)
// ============================================================
exports.updateRequestStatus = (req, res) => {
    const requestId = req.params.id;
    // 🚀 Lấy thêm employee_id do Frontend gửi xuống
    const { status, employee_id } = req.body; 

    let sql = 'UPDATE repair_requests SET status = ? WHERE id = ?';
    let params = [status, requestId];

    // Nếu Frontend có truyền employee_id (nghĩa là có phân công thợ)
    if (employee_id !== undefined) {
        sql = 'UPDATE repair_requests SET status = ?, employee_id = ? WHERE id = ?';
        params = [status, employee_id, requestId];
    }

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        // Logic gửi thông báo khi hoàn thành giữ nguyên
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
        res.status(200).json({ message: 'Đã cập nhật tiến độ và nhân viên!' });
    });
};

// GIỮ NGUYÊN
exports.deleteRequest = (req, res) => {
    const requestId = req.params.id;
    db.query('DELETE FROM repair_requests WHERE id = ?', [requestId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Đã từ chối đơn hàng' });
    });
};