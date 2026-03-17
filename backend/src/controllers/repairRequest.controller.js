const db = require("../config/db");

//
// 🧠 TÌM STORE GẦN NHẤT
//
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
      ORDER BY distance ASC, google_rating DESC
      LIMIT 1
    `;

    db.query(query, [lat, lng, lat], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

//
// 🔧 CREATE REQUEST FULL
//
exports.createRepairRequest = async (req, res) => {
  try {
    const user_id = req.user.id;

    // 🔥 NHẬN FULL DATA
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
    // ❗ VALIDATE
    //
    if (!title || !description) {
      return res.status(400).json({ message: "Thiếu tiêu đề hoặc mô tả" });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Thiếu vị trí" });
    }

    //
    // 📝 INSERT REQUEST
    //
    const sql = `
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

    const values = [
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
      symptoms
    ];

    db.query(sql, values, async (err, result) => {
      if (err) {
        console.error("Insert request error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      const requestId = result.insertId;

      //
      // 🔍 TÌM STORE GẦN NHẤT
      //
      let nearestStore = null;

      try {
        nearestStore = await findNearestStore(latitude, longitude);
      } catch (e) {
        console.error("Find store error:", e);
      }

      //
      // ❗ KHÔNG CÓ STORE
      //
      if (!nearestStore) {
        return res.status(201).json({
          message: "Tạo request thành công nhưng chưa có store phù hợp",
          request_id: requestId
        });
      }

      console.log("Store gần nhất:", nearestStore);

      //
      // 💰 TẠO QUOTE AUTO
      //
      const quoteSql = `
        INSERT INTO quotes (request_id, store_id, status)
        VALUES (?, ?, 'PENDING')
      `;

      db.query(quoteSql, [requestId, nearestStore.id]);

      //
      // 🔔 NOTIFICATION
      //
      const notifySql = `
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, 'SYSTEM')
      `;

      db.query(notifySql, [
        nearestStore.user_id,
        "Job mới",
        `Có yêu cầu sửa chữa gần bạn (~${nearestStore.distance.toFixed(2)} km)`
      ]);

      //
      // ✅ RESPONSE
      //
      res.status(201).json({
        message: "Tạo yêu cầu thành công",
        request_id: requestId,
        assigned_store: nearestStore.store_name,
        distance_km: Number(nearestStore.distance.toFixed(2))
      });
    });

  } catch (error) {
    console.error("Create request error:", error);
    res.status(500).json({ message: "Server error" });
  }
};