const db = require('../config/db');

// 1. Lấy danh sách sản phẩm
exports.getProducts = (req, res) => {
    const userId = req.params.userId;
    db.query('SELECT * FROM products WHERE user_id = ? ORDER BY id DESC', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
};

// 2. Thêm sản phẩm mới
exports.addProduct = (req, res) => {
    const { userId, name, type, price, image } = req.body;
    db.query(
        'INSERT INTO products (user_id, name, type, price, image) VALUES (?, ?, ?, ?, ?)',
        [userId, name, type, price, image],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: "Thêm thành công", id: result.insertId });
        }
    );
};

// 3. Xóa sản phẩm
exports.deleteProduct = (req, res) => {
    const productId = req.params.id;
    db.query('DELETE FROM products WHERE id = ?', [productId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: "Xóa thành công" });
    });
};