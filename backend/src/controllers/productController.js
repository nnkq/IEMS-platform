const db = require('../config/db');
const { emitDataChanged } = require('../socket');

// 1. Lấy danh sách sản phẩm
exports.getProducts = (req, res) => {
    const ownerOrStoreId = req.params.userId;
    db.query(
        `SELECT DISTINCT p.*
         FROM products p
         LEFT JOIN stores s ON s.user_id = p.user_id
         WHERE p.user_id = ? OR s.id = ?
         ORDER BY p.id DESC`,
        [ownerOrStoreId, ownerOrStoreId],
        (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
        }
    );
};

// 2. Thêm sản phẩm mới
exports.addProduct = (req, res) => {
    const { userId, name, type, price, image } = req.body;
    db.query(
        'INSERT INTO products (user_id, name, type, price, image) VALUES (?, ?, ?, ?, ?)',
        [userId, name, type, price, image],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            emitDataChanged({
                entity: 'product',
                action: 'created',
                userId,
                productId: result.insertId,
            });
            res.status(201).json({ message: "Thêm thành công", id: result.insertId });
        }
    );
};

// 3. Xóa sản phẩm
exports.deleteProduct = (req, res) => {
    const productId = req.params.id;
    db.query('DELETE FROM products WHERE id = ?', [productId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        emitDataChanged({
            entity: 'product',
            action: 'deleted',
            productId: Number(productId),
        });
        res.status(200).json({ message: "Xóa thành công" });
    });
};
