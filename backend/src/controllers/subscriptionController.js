const db = require('../config/db');

// 1. Kiểm tra xem cửa hàng đang dùng gói nào
exports.getSubscription = (req, res) => {
    const userId = req.params.userId;
    db.query('SELECT * FROM store_subscriptions WHERE user_id = ? AND status = "ACTIVE"', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) {
            res.status(200).json(results[0]); // Trả về gói hiện tại
        } else {
            res.status(200).json(null); // Chưa đăng ký gói nào
        }
    });
};

// 2. Nâng cấp gói (Lưu vào Database sau khi giả lập thanh toán)
exports.upgradeSubscription = (req, res) => {
    const { userId, packageName, durationDays } = req.body;

    // Tính ngày hết hạn (Mặc định cho 30 ngày)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + (durationDays || 30));

    db.query('SELECT * FROM store_subscriptions WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
            // Đã từng có gói -> Update lên gói mới
            const sql = 'UPDATE store_subscriptions SET package_name = ?, status = "ACTIVE", start_date = ?, end_date = ? WHERE user_id = ?';
            db.query(sql, [packageName, startDate, endDate, userId], (updateErr) => {
                if (updateErr) return res.status(500).json({ error: updateErr.message });
                res.status(200).json({ message: "Nâng cấp gói thành công!", package_name: packageName });
            });
        } else {
            // Chưa từng có gói -> Tạo mới
            const sql = 'INSERT INTO store_subscriptions (user_id, package_name, status, start_date, end_date) VALUES (?, ?, "ACTIVE", ?, ?)';
            db.query(sql, [userId, packageName, startDate, endDate], (insertErr) => {
                if (insertErr) return res.status(500).json({ error: insertErr.message });
                res.status(201).json({ message: "Đăng ký gói thành công!", package_name: packageName });
            });
        }
    });
};