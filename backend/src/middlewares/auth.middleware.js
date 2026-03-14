const jwt = require("jsonwebtoken");
const db = require("../config/db");

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Không có token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    db.query(
      "SELECT id, name, email, role FROM users WHERE id = ?",
      [decoded.id],
      (err, results) => {
        if (err) {
          return res.status(500).json({ message: "Lỗi server", err });
        }

        if (results.length === 0) {
          return res.status(401).json({ message: "Người dùng không tồn tại" });
        }

        req.user = results[0];
        next();
      }
    );
  } catch (error) {
    return res.status(401).json({
      message: "Token không hợp lệ",
      error: error.message,
    });
  }
};

module.exports = {
  protect,
};