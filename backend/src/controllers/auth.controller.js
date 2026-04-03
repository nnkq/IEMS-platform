const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendMail = require('../utils/sendMail');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const normalizeRole = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const role = String(value).trim().toUpperCase();
  return ['USER', 'STORE', 'ADMIN'].includes(role) ? role : null;
};
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
    }

    const safeRole = normalizeRole(role);

    if (!safeRole) {
      return res.status(400).json({ message: 'Vui lòng chọn vai trò USER hoặc STORE' });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) return res.status(500).json({ message: 'Lỗi server', err });

      if (results.length > 0) {
        return res.status(400).json({ message: 'Email đã tồn tại' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      db.query(
        'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
        [name, email, hashedPassword, phone || null, safeRole],
        (insertErr, result) => {
          if (insertErr) return res.status(500).json({ message: 'Lỗi server', err: insertErr });

          return res.status(201).json({
            message: 'Đăng ký thành công',
            user: {
              id: result.insertId,
              name,
              email,
              phone: phone || null,
              role: safeRole,
            },
          });
        }
      );
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server', error: error.message || error });
  }
};
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) return res.status(500).json({ message: 'Lỗi server', err });

      if (results.length === 0) {
        return res.status(400).json({ message: 'Email không tồn tại' });
      }

      const user = results[0];

      if (user.status === 'BLOCKED') {
        return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
      }

      if (!user.password) {
        return res.status(400).json({ message: 'Tài khoản này dùng đăng nhập Google' });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({ message: 'Sai mật khẩu' });
      }

      const token = generateToken(user);

      return res.json({
        message: 'Đăng nhập thành công',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || null,
          role: user.role,
          status: user.status || 'ACTIVE',
        },
      });
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server', error: error.message || error });
  }
};

const forgotPassword = (req, res) => {
  try {
    const { email } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) return res.status(500).json({ message: 'Lỗi server', err });

      if (results.length === 0) {
        return res.status(404).json({ message: 'Không tìm thấy email' });
      }

      const user = results[0];
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expire = new Date(Date.now() + 15 * 60 * 1000);

      db.query(
        'UPDATE users SET reset_token = ?, reset_token_expire = ? WHERE id = ?',
        [resetToken, expire, user.id],
        async (updateErr) => {
          if (updateErr) {
            return res.status(500).json({ message: 'Lỗi server', updateErr });
          }

          const resetLink = `${CLIENT_URL}/reset-password/${resetToken}`;

          await sendMail(
            email,
            'Khôi phục mật khẩu',
            `
              <h3>Khôi phục mật khẩu</h3>
              <p>Nhấn vào link bên dưới để đặt lại mật khẩu:</p>
              <a href="${resetLink}">${resetLink}</a>
              <p>Link hết hạn sau 15 phút.</p>
            `
          );

          return res.json({ message: 'Đã gửi email khôi phục mật khẩu' });
        }
      );
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server', error: error.message || error });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    db.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expire > NOW()',
      [token],
      async (err, results) => {
        if (err) return res.status(500).json({ message: 'Lỗi server', err });

        if (results.length === 0) {
          return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
        }

        const user = results[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        db.query(
          'UPDATE users SET password = ?, reset_token = NULL, reset_token_expire = NULL WHERE id = ?',
          [hashedPassword, user.id],
          (updateErr) => {
            if (updateErr) {
              return res.status(500).json({ message: 'Lỗi server', updateErr });
            }

            return res.json({ message: 'Đặt lại mật khẩu thành công' });
          }
        );
      }
    );
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server', error: error.message || error });
  }
};

const googleSuccess = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Google login thất bại' });
  }

  db.query('SELECT * FROM users WHERE email = ?', [req.user.email], (err, results) => {
    if (err || results.length === 0) {
      return res.redirect(`${CLIENT_URL}/login?error=true`);
    }

    const dbUser = results[0];

    if (dbUser.status === 'BLOCKED') {
      return res.redirect(`${CLIENT_URL}/login?blocked=true`);
    }

    const token = generateToken(dbUser);
    const userData = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone || null,
      role: dbUser.role,
      status: dbUser.status || 'ACTIVE',
    };

    const encodedUser = encodeURIComponent(JSON.stringify(userData));
    return res.redirect(`${CLIENT_URL}/google-success?token=${token}&user=${encodedUser}`);
  });
};

const googleFailure = (req, res) => {
  return res.status(401).json({ message: 'Đăng nhập Google thất bại' });
};
const selectRole = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { role } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const safeRole = String(role || "").trim().toUpperCase();

    if (!["USER", "STORE"].includes(safeRole)) {
      return res.status(400).json({ message: "Vai trò không hợp lệ" });
    }

    db.query(
      "UPDATE users SET role = ? WHERE id = ?",
      [safeRole, userId],
      (err) => {
        if (err) {
          return res.status(500).json({ message: "Lỗi server", err });
        }

        db.query(
          "SELECT id, name, email, phone, role, status FROM users WHERE id = ? LIMIT 1",
          [userId],
          (selectErr, results) => {
            if (selectErr) {
              return res.status(500).json({ message: "Lỗi server", err: selectErr });
            }

            if (!results.length) {
              return res.status(404).json({ message: "Không tìm thấy user" });
            }

            return res.json({
              message: "Cập nhật vai trò thành công",
              user: results[0],
            });
          }
        );
      }
    );
  } catch (error) {
    return res.status(500).json({
      message: "Lỗi server",
      error: error.message || error,
    });
  }
};
module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  googleSuccess,
  googleFailure,
  selectRole,
};