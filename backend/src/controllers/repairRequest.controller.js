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
      image,
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
    const cleanImage = toStringOrNull(image);

    if (!cleanTitle || !cleanDescription) {
      return res.status(400).json({ message: 'Thiếu tiêu đề hoặc mô tả' });
    }

    if (cleanLatitude === null || cleanLongitude === null) {
      return res.status(400).json({ message: 'Thiếu vị trí' });
    }

    let finalDeviceId = null;
    if (cleanDeviceId !== null) {
      const deviceRows = await queryAsync(
        'SELECT id FROM devices WHERE id = ? LIMIT 1',
        [cleanDeviceId]
      );
      if (deviceRows.length > 0) finalDeviceId = cleanDeviceId;
    }

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
        image,
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', NOW())
    `;

    const insertValues = [
      userId,
      store_id || null,
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
      cleanImage,
    ];

    const result = await queryAsync(insertSql, insertValues);
    const requestId = result.insertId;

    let assignedStoreName = null;
    let assignedStoreUserId = null;

    if (store_id) {
      const storeInfo = await queryAsync(
        'SELECT user_id, store_name FROM stores WHERE id = ?',
        [store_id]
      );
      if (storeInfo.length > 0) {
        assignedStoreName = storeInfo[0].store_name;
        assignedStoreUserId = storeInfo[0].user_id;
      }
    }

    try {
      if (assignedStoreUserId) {
        const notifySql = `
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, ?, ?, 'SYSTEM')
        `;
        await queryAsync(notifySql, [
          assignedStoreUserId,
          'Job mới',
          'Khách hàng vừa gửi trực tiếp một yêu cầu sửa chữa đến cửa hàng của bạn!',
        ]);
      }
    } catch (notifyErr) {
      console.error('Insert notification error:', notifyErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Tạo yêu cầu thành công',
      request_id: requestId,
      assigned_store: assignedStoreName,
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

exports.getMyRepairRequests = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT
      rr.*,
      s.store_name,
      e.name AS employee_name,
      q.id AS quote_id,
      q.price AS quote_price,
      q.message AS quote_message,
      q.estimated_time AS quote_estimated_time,
      q.status AS quote_status,
      q.created_at AS quote_created_at,
      o.id AS order_id,
      rv.id AS review_id,
      rv.rating AS review_rating,
      rv.comment AS review_comment,
      rv.created_at AS review_created_at
    FROM repair_requests rr
    LEFT JOIN stores s ON s.id = rr.store_id
    LEFT JOIN employees e ON e.id = rr.employee_id
    LEFT JOIN quotes q ON q.id = (
      SELECT q2.id
      FROM quotes q2
      WHERE q2.request_id = rr.id
      ORDER BY q2.id DESC
      LIMIT 1
    )
    LEFT JOIN orders o ON o.request_id = rr.id
    LEFT JOIN reviews rv ON rv.order_id = o.id AND rv.user_id = rr.user_id
    WHERE rr.user_id = ?
    ORDER BY rr.created_at DESC, rr.id DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('getMyRepairRequests error:', err);
      return res.status(500).json({ error: 'Lỗi lấy danh sách yêu cầu' });
    }

    const mappedRequests = results.map((row) => ({
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      title: row.title || 'Yêu cầu sửa chữa',
      description: row.description || '',
      budget: row.budget || '',
      location: row.location || '',
      store_id: row.store_id || null,
      store_name: row.store_name || 'Cửa hàng chưa xác định',
      employee_id: row.employee_id || null,
      employee_name: row.employee_name || null,
      quote_id: row.quote_id || null,
      quote_price: row.quote_price || 0,
      quote_message: row.quote_message || '',
      quote_estimated_time: row.quote_estimated_time || '',
      quote_status: row.quote_status || null,
      quote_created_at: row.quote_created_at || null,
      order_id: row.order_id || null,
      has_review: !!row.review_id,
      review: row.review_id
        ? {
            id: row.review_id,
            rating: Number(row.review_rating || 0),
            comment: row.review_comment || '',
            created_at: row.review_created_at,
          }
        : null,
      can_review: row.status === 'COMPLETED' && !!row.order_id,
      device_name:
        `${row.brand || ''} ${row.model || ''}`.trim() ||
        row.device_type ||
        'Thiết bị chưa rõ',
      device_category: row.device_type || 'Chưa phân loại',
      technician_note: row.technician_note || null,
      image: row.image || null,
    }));

    res.json({ requests: mappedRequests });
  });
};

exports.getRepairRequestsDetail = async (req, res) => {
  try {
    const requestId = req.params.id;
    const sql = `SELECT * FROM repair_requests WHERE id = ?`;
    const [rows] = await db.promise().query(sql, [requestId]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Không tìm thấy yêu cầu này' });
    }

    return res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error('Lỗi getRepairRequestsDetail:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Lỗi server', error: error.message });
  }
};

exports.getOngoingRepairs = async (req, res) => {
  try {
    const storeId = req.query.storeId;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp storeId.',
      });
    }

    const query = `
      SELECT id, user_id, title, brand, model, device_type, status, image
      FROM repair_requests
      WHERE store_id = ? AND status = 'IN_PROGRESS'
    `;

    const [rows] = await db.promise().query(query, [storeId]);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách máy đang sửa:', error);
    return res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi server khi lấy dữ liệu.',
      error: error.message,
    });
  }
};

exports.updateRepairProgress = async (req, res) => {
  try {
    const requestId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp trạng thái cần cập nhật.',
      });
    }

    const updateQuery = `UPDATE repair_requests SET status = ? WHERE id = ?`;
    const [result] = await db.promise().query(updateQuery, [status, requestId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy yêu cầu sửa chữa này.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Cập nhật tiến độ thành công!',
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật tiến độ:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật tiến độ.',
      error: error.message,
    });
  }
};

exports.getStoreRequests = (req, res) => {
  const storeId = req.query.storeId;

  if (!storeId) {
    return res
      .status(400)
      .json({ error: 'Thiếu storeId. Vui lòng truyền storeId trên URL (VD: ?storeId=1)' });
  }

  const sql = `
    SELECT
      r.*,
      u.name AS customer_name,
      e.name AS employee_name,
      q.id AS quote_id,
      q.price AS quote_price,
      q.message AS quote_message,
      q.estimated_time AS quote_estimated_time,
      q.status AS quote_status,
      q.created_at AS quote_created_at
    FROM repair_requests r
    LEFT JOIN users u ON u.id = r.user_id
    LEFT JOIN employees e ON r.employee_id = e.id
    LEFT JOIN quotes q ON q.id = (
      SELECT q2.id
      FROM quotes q2
      WHERE q2.request_id = r.id
      ORDER BY q2.id DESC
      LIMIT 1
    )
    WHERE r.store_id = ?
    ORDER BY r.created_at DESC
  `;

  db.query(sql, [storeId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(results);
  });
};

exports.updateRequestStatus = (req, res) => {
  const requestId = req.params.id;
  const { status, employee_id } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Thiếu status cập nhật' });
  }

  let sql = 'UPDATE repair_requests SET status = ? WHERE id = ?';
  let params = [status, requestId];

  if (employee_id !== undefined) {
    sql = 'UPDATE repair_requests SET status = ?, employee_id = ? WHERE id = ?';
    params = [status, employee_id, requestId];
  }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu sửa chữa' });
    }

    if (status === 'WAITING_CUSTOMER_CONFIRM' || status === 'COMPLETED') {
      db.query(
        'SELECT id, user_id, store_id, budget, brand, model, device_type FROM repair_requests WHERE id = ?',
        [requestId],
        (selErr, selRes) => {
          if (selErr || selRes.length === 0) {
            if (selErr) console.error('Lỗi lấy request hoàn thành:', selErr);
            return;
          }

          const requestRow = selRes[0];
          const customerId = requestRow.user_id;
          const storeId = requestRow.store_id;
          const deviceName =
            `${requestRow.brand || ''} ${requestRow.model || ''}`.trim() ||
            requestRow.device_type ||
            'Thiết bị';

          if (status === 'COMPLETED') {
            const message = `🎉 Tuyệt vời! Thiết bị ${deviceName} của bạn đã được xác nhận hoàn thành. Bạn có thể vào mục Theo dõi để đánh giá cửa hàng.`;

            db.query(
              'SELECT q.id, q.price FROM quotes q WHERE q.request_id = ? AND q.status = "ACCEPTED" ORDER BY q.id DESC LIMIT 1',
              [requestId],
              (quoteErr, quoteRows) => {
                if (quoteErr) {
                  console.error('Lỗi kiểm tra quote:', quoteErr);
                  return;
                }

                const acceptedQuote = quoteRows[0] || null;
                const finalPrice = acceptedQuote?.price || requestRow.budget || 0;

                db.query(
                  'SELECT id FROM orders WHERE request_id = ? LIMIT 1',
                  [requestId],
                  (orderErr, orderRows) => {
                    if (orderErr) {
                      console.error('Lỗi kiểm tra order:', orderErr);
                    } else if (orderRows.length === 0) {
                      db.query(
                        `INSERT INTO orders (request_id, store_id, quote_id, user_id, final_price, status, start_time, end_time)
                         VALUES (?, ?, ?, ?, ?, 'COMPLETED', NOW(), NOW())`,
                        [requestId, storeId || null, acceptedQuote?.id || null, customerId || null, finalPrice],
                        (insertOrderErr) => {
                          if (insertOrderErr) console.error('Lỗi tạo order hoàn tất:', insertOrderErr);
                        }
                      );
                    } else {
                      db.query(
                        `UPDATE orders
                         SET status = 'COMPLETED',
                             end_time = NOW(),
                             final_price = COALESCE(final_price, ?),
                             quote_id = COALESCE(quote_id, ?),
                             store_id = COALESCE(store_id, ?),
                             user_id = COALESCE(user_id, ?)
                         WHERE request_id = ?`,
                        [finalPrice, acceptedQuote?.id || null, storeId || null, customerId || null, requestId],
                        (updateOrderErr) => {
                          if (updateOrderErr) console.error('Lỗi cập nhật order hoàn tất:', updateOrderErr);
                        }
                      );
                    }
                  }
                );
              }
            );

            db.query(
              'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, "SYSTEM")',
              [customerId, 'Sửa chữa hoàn tất', message],
              (insErr) => {
                if (insErr) console.error('Lỗi tạo thông báo:', insErr);
              }
            );
          }

          if (status === 'WAITING_CUSTOMER_CONFIRM') {
            const message = `📦 Store báo thiết bị ${deviceName} đã sửa xong và sẵn sàng bàn giao. Vui lòng vào mục Theo dõi để xác nhận đã hoàn thành.`;
            db.query(
              'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, "SYSTEM")',
              [customerId, 'Store đã báo hoàn thành', message],
              (insErr) => {
                if (insErr) console.error('Lỗi tạo thông báo chờ khách xác nhận:', insErr);
              }
            );
          }
        }
      );
    }

    res.status(200).json({ message: 'Đã cập nhật tiến độ và nhân viên!' });
  });
};

exports.getReviewForRequest = (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;

  const sql = `
    SELECT
      rv.id,
      rv.rating,
      rv.comment,
      rv.created_at,
      rr.id AS request_id,
      rr.status,
      rr.store_id,
      s.store_name,
      o.id AS order_id
    FROM repair_requests rr
    LEFT JOIN stores s ON s.id = rr.store_id
    LEFT JOIN orders o ON o.request_id = rr.id
    LEFT JOIN reviews rv ON rv.order_id = o.id AND rv.user_id = rr.user_id
    WHERE rr.id = ? AND rr.user_id = ?
    LIMIT 1
  `;

  db.query(sql, [requestId, userId], (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ success: false, message: 'Lỗi lấy đánh giá', error: err.message });
    }

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Không tìm thấy yêu cầu này' });
    }

    const row = rows[0];
    return res.status(200).json({
      success: true,
      canReview: row.status === 'COMPLETED' && !!row.order_id,
      hasReview: !!row.id,
      review: row.id
        ? {
            id: row.id,
            rating: Number(row.rating || 0),
            comment: row.comment || '',
            created_at: row.created_at,
          }
        : null,
      store: {
        id: row.store_id || null,
        name: row.store_name || 'Cửa hàng chưa xác định',
      },
      order_id: row.order_id || null,
    });
  });
};

exports.submitReviewForRequest = (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || '').trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res
      .status(400)
      .json({ success: false, message: 'Số sao phải từ 1 đến 5' });
  }

  const findSql = `
    SELECT rr.id AS request_id, rr.status, rr.store_id, o.id AS order_id, rv.id AS review_id
    FROM repair_requests rr
    LEFT JOIN orders o ON o.request_id = rr.id
    LEFT JOIN reviews rv ON rv.order_id = o.id AND rv.user_id = rr.user_id
    WHERE rr.id = ? AND rr.user_id = ?
    LIMIT 1
  `;

  db.query(findSql, [requestId, userId], (findErr, rows) => {
    if (findErr) {
      return res
        .status(500)
        .json({ success: false, message: 'Lỗi kiểm tra đánh giá', error: findErr.message });
    }

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Không tìm thấy yêu cầu này' });
    }

    const row = rows[0];

    if (row.status !== 'COMPLETED') {
      return res
        .status(400)
        .json({ success: false, message: 'Chỉ đánh giá được khi đơn đã hoàn thành' });
    }

    if (!row.order_id) {
      return res
        .status(400)
        .json({ success: false, message: 'Đơn này chưa có order để đánh giá' });
    }

    if (row.review_id) {
      return res
        .status(400)
        .json({ success: false, message: 'Bạn đã đánh giá đơn này rồi' });
    }

    db.query(
      'INSERT INTO reviews (order_id, user_id, store_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [row.order_id, userId, row.store_id, rating, comment || null],
      (insertErr, result) => {
        if (insertErr) {
          return res
            .status(500)
            .json({ success: false, message: 'Lưu đánh giá thất bại', error: insertErr.message });
        }

        db.query(
          `UPDATE stores s
           JOIN (
             SELECT store_id, ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS total_reviews
             FROM reviews
             WHERE store_id = ?
             GROUP BY store_id
           ) x ON x.store_id = s.id
           SET s.google_rating = x.avg_rating,
               s.rating_avg = x.avg_rating,
               s.total_reviews = x.total_reviews
           WHERE s.id = ?`,
          [row.store_id, row.store_id],
          (storeErr) => {
            if (storeErr) console.error('Lỗi cập nhật rating store:', storeErr);
          }
        );

        return res.status(201).json({
          success: true,
          message: 'Đánh giá cửa hàng thành công',
          review: {
            id: result.insertId,
            rating,
            comment,
          },
        });
      }
    );
  });
};


exports.confirmRepairCompletion = async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const userId = req.user.id;

    const rows = await queryAsync(
      `
      SELECT rr.id, rr.status, rr.user_id, rr.store_id, rr.budget, rr.brand, rr.model, rr.device_type, o.id AS order_id
      FROM repair_requests rr
      LEFT JOIN orders o ON o.request_id = rr.id
      WHERE rr.id = ? AND rr.user_id = ?
      LIMIT 1
      `,
      [requestId, userId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu sửa chữa' });
    }

    const row = rows[0];

    if (row.status !== 'WAITING_CUSTOMER_CONFIRM') {
      return res.status(400).json({ success: false, message: 'Đơn này chưa ở bước chờ khách hàng xác nhận hoàn thành' });
    }

    await queryAsync('UPDATE repair_requests SET status = "COMPLETED" WHERE id = ?', [requestId]);

    if (row.order_id) {
      await queryAsync(
        `UPDATE orders
         SET status = 'COMPLETED',
             end_time = COALESCE(end_time, NOW())
         WHERE id = ?`,
        [row.order_id]
      );
    }

    const deviceName =
      `${row.brand || ''} ${row.model || ''}`.trim() ||
      row.device_type ||
      'Thiết bị';

    const storeRows = await queryAsync('SELECT user_id, store_name FROM stores WHERE id = ? LIMIT 1', [row.store_id]);
    if (storeRows.length > 0 && storeRows[0].user_id) {
      await queryAsync(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, "SYSTEM")',
        [
          storeRows[0].user_id,
          'Khách đã xác nhận hoàn thành',
          `Khách hàng đã xác nhận yêu cầu #RQ-${requestId} (${deviceName}) đã hoàn thành. Bạn có thể kết thúc đơn và nhận đánh giá.`,
        ]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Bạn đã xác nhận nhận máy và hoàn thành sửa chữa thành công.',
    });
  } catch (error) {
    console.error('confirmRepairCompletion error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xác nhận hoàn thành', error: error.message });
  }
};

exports.acceptQuote = async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const userId = req.user.id;

    const rows = await queryAsync(
      `
      SELECT rr.id, rr.user_id, rr.store_id, rr.status, q.id AS quote_id, q.price, q.status AS quote_status
      FROM repair_requests rr
      INNER JOIN quotes q ON q.id = (
        SELECT q2.id
        FROM quotes q2
        WHERE q2.request_id = rr.id
        ORDER BY q2.id DESC
        LIMIT 1
      )
      WHERE rr.id = ? AND rr.user_id = ?
      LIMIT 1
      `,
      [requestId, userId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu hoặc báo giá' });
    }

    const row = rows[0];
    if (row.quote_status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Báo giá này không còn ở trạng thái chờ phản hồi' });
    }

    await queryAsync('UPDATE quotes SET status = "ACCEPTED" WHERE id = ?', [row.quote_id]);
    await queryAsync('UPDATE repair_requests SET status = "IN_PROGRESS" WHERE id = ?', [requestId]);

    const existingOrder = await queryAsync('SELECT id FROM orders WHERE request_id = ? LIMIT 1', [requestId]);
    if (existingOrder.length > 0) {
      await queryAsync(
        `UPDATE orders
         SET quote_id = ?, final_price = ?, status = 'IN_PROGRESS', start_time = COALESCE(start_time, NOW())
         WHERE request_id = ?`,
        [row.quote_id, row.price || 0, requestId]
      );
    } else {
      await queryAsync(
        `INSERT INTO orders (request_id, store_id, quote_id, user_id, final_price, status, start_time)
         VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS', NOW())`,
        [requestId, row.store_id || null, row.quote_id, userId, row.price || 0]
      );
    }

    try {
      const storeRows = await queryAsync('SELECT user_id, store_name FROM stores WHERE id = ? LIMIT 1', [row.store_id]);
      if (storeRows.length > 0 && storeRows[0].user_id) {
        await queryAsync(
          'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, "SYSTEM")',
          [storeRows[0].user_id, 'Khách đã đồng ý báo giá', `Khách hàng đã đồng ý báo giá cho yêu cầu #RQ-${requestId}. Bạn có thể tiến hành sửa chữa.`,]
        );
      }
    } catch (notifyErr) {
      console.error('Notify accept quote error:', notifyErr);
    }

    return res.json({ success: true, message: 'Bạn đã đồng ý báo giá. Cửa hàng sẽ tiến hành sửa chữa.' });
  } catch (error) {
    console.error('acceptQuote error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi chấp nhận báo giá', error: error.message });
  }
};

exports.rejectQuote = async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const userId = req.user.id;

    const rows = await queryAsync(
      `
      SELECT rr.id, rr.user_id, rr.store_id, q.id AS quote_id, q.status AS quote_status
      FROM repair_requests rr
      INNER JOIN quotes q ON q.id = (
        SELECT q2.id
        FROM quotes q2
        WHERE q2.request_id = rr.id
        ORDER BY q2.id DESC
        LIMIT 1
      )
      WHERE rr.id = ? AND rr.user_id = ?
      LIMIT 1
      `,
      [requestId, userId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu hoặc báo giá' });
    }

    const row = rows[0];
    if (row.quote_status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Báo giá này không còn ở trạng thái chờ phản hồi' });
    }

    await queryAsync('UPDATE quotes SET status = "REJECTED" WHERE id = ?', [row.quote_id]);
    await queryAsync('UPDATE repair_requests SET status = "CANCELLED" WHERE id = ?', [requestId]);
    await queryAsync('UPDATE orders SET status = "CANCELLED" WHERE request_id = ?', [requestId]);

    try {
      const storeRows = await queryAsync('SELECT user_id FROM stores WHERE id = ? LIMIT 1', [row.store_id]);
      if (storeRows.length > 0 && storeRows[0].user_id) {
        await queryAsync(
          'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, "SYSTEM")',
          [storeRows[0].user_id, 'Khách từ chối báo giá', `Khách hàng đã từ chối báo giá cho yêu cầu #RQ-${requestId}.`,]
        );
      }
    } catch (notifyErr) {
      console.error('Notify reject quote error:', notifyErr);
    }

    return res.json({ success: true, message: 'Bạn đã từ chối báo giá. Yêu cầu đã được hủy.' });
  } catch (error) {
    console.error('rejectQuote error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi từ chối báo giá', error: error.message });
  }
};

exports.deleteRequest = (req, res) => {
  const requestId = req.params.id;
  db.query('DELETE FROM repair_requests WHERE id = ?', [requestId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json({ message: 'Đã từ chối đơn hàng' });
  });
};
exports.getStoreReviews = (req, res) => {
  const storeId = req.params.storeId;

  const sql = `
    SELECT
      rv.id,
      rv.rating,
      rv.comment,
      rv.created_at,
      u.name AS user_name,
      rr.id AS request_id,
      rr.title AS request_title,
      rr.device_type,
      rr.brand,
      rr.model
    FROM reviews rv
    LEFT JOIN users u ON u.id = rv.user_id
    LEFT JOIN orders o ON o.id = rv.order_id
    LEFT JOIN repair_requests rr ON rr.id = o.request_id
    WHERE rv.store_id = ?
    ORDER BY rv.created_at DESC
  `;

  db.query(sql, [storeId], (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Lỗi lấy danh sách đánh giá",
        error: err.message,
      });
    }

    const mapped = rows.map((item) => ({
      id: item.id,
      rating: Number(item.rating || 0),
      comment: item.comment || "",
      created_at: item.created_at,
      user_name: item.user_name || "Khách hàng",
      request_id: item.request_id,
      request_title: item.request_title || "Yêu cầu sửa chữa",
      device_name:
        `${item.brand || ""} ${item.model || ""}`.trim() ||
        item.device_type ||
        "Thiết bị",
    }));

    return res.json({
      success: true,
      reviews: mapped,
    });
  });
};