const db = require('../config/db');

// 1. Hàm lấy thông tin hồ sơ cửa hàng
exports.getStoreProfile = (req, res) => {
    const userId = req.params.userId;
    
    db.query('SELECT * FROM stores WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Nếu chưa có hồ sơ, trả về rỗng để web tự hiện form trống
        if (results.length === 0) return res.status(200).json(null); 
        
        res.status(200).json(results[0]);
    });
};
// 2. Hàm Lưu/Cập nhật hồ sơ cửa hàng
exports.updateStoreProfile = (req, res) => {
    const { userId, storeName, phone, address, description, openTime, closeTime } = req.body;

    // Kiểm tra xem user này đã tạo hồ sơ bao giờ chưa
    db.query('SELECT * FROM stores WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
            // Đã có hồ sơ -> CẬP NHẬT (UPDATE)
            const sql = 'UPDATE stores SET store_name=?, phone=?, address=?, description=?, open_time=?, close_time=? WHERE user_id=?';
            db.query(sql, [storeName, phone, address, description, openTime, closeTime, userId], (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(200).json({ message: "Cập nhật hồ sơ thành công!" });
            });
        } else {
            // Chưa có hồ sơ -> TẠO MỚI (INSERT)
            const sql = 'INSERT INTO stores (user_id, store_name, phone, address, description, open_time, close_time) VALUES (?, ?, ?, ?, ?, ?, ?)';
            db.query(sql, [userId, storeName, phone, address, description, openTime, closeTime], (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ message: "Tạo hồ sơ mới thành công!" });
            });
        }
    });
};