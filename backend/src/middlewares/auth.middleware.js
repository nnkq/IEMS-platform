const jwt = require('jsonwebtoken');
const db = require('../config/db');

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Unauthorized - Token missing',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const sql = `
      SELECT id, name, email, phone, role, status
      FROM users
      WHERE id = ?
      LIMIT 1
    `;

    db.query(sql, [decoded.id], (err, results) => {
      if (err) {
        console.error('Auth DB error:', err);
        return res.status(500).json({
          message: 'Database error',
        });
      }

      if (results.length === 0) {
        return res.status(401).json({
          message: 'User not found',
        });
      }

      const user = results[0];

      if (user.status === 'BLOCKED') {
        return res.status(403).json({
          message: 'Tài khoản đã bị khóa',
        });
      }

      req.user = user;
      next();
    });
  } catch (error) {
    console.error('JWT error:', error);
    return res.status(401).json({
      message: 'Invalid token',
    });
  }
};

module.exports = {
  protect,
};