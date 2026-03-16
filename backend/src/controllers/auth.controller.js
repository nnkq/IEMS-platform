const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendMail = require("../utils/sendMail");

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Đăng ký
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
    }

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) return res.status(500).json({ message: "Lỗi server", err });

      if (results.length > 0) {
        return res.status(400).json({ message: "Email đã tồn tại" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      db.query(
        "INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)",
        [name, email, hashedPassword, phone || null, role || "USER"],
        (err, result) => {
          if (err) return res.status(500).json({ message: "Lỗi server", err });

          res.status(201).json({
            message: "Đăng ký thành công",
            user: {
              id: result.insertId,
              name,
              email,
              role: role || "USER"
            }
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error });
  }
};

// Đăng nhập
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) return res.status(500).json({ message: "Lỗi server", err });

      if (results.length === 0) {
        return res.status(400).json({ message: "Email không tồn tại" });
      }

      const user = results[0];

      if (!user.password) {
        return res.status(400).json({ message: "Tài khoản này dùng đăng nhập Google" });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({ message: "Sai mật khẩu" });
      }

      const token = generateToken(user);

      res.json({
        message: "Đăng nhập thành công",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error });
  }
};

// Quên mật khẩu
const forgotPassword = (req, res) => {
  try {
    const { email } = req.body;

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) return res.status(500).json({ message: "Lỗi server", err });

      if (results.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy email" });
      }

      const user = results[0];
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expire = new Date(Date.now() + 15 * 60 * 1000);

      db.query(
        "UPDATE users SET reset_token = ?, reset_token_expire = ? WHERE id = ?",
        [resetToken, expire, user.id],
        async (updateErr) => {
          if (updateErr) {
            return res.status(500).json({ message: "Lỗi server", updateErr });
          }

          const resetLink = `http://localhost:5173/reset-password/${resetToken}`;

          await sendMail(
            email,
            "Khôi phục mật khẩu",
            `
              <h3>Khôi phục mật khẩu</h3>
              <p>Nhấn vào link bên dưới để đặt lại mật khẩu:</p>
              <a href="${resetLink}">${resetLink}</a>
              <p>Link hết hạn sau 15 phút.</p>
            `
          );

          res.json({ message: "Đã gửi email khôi phục mật khẩu" });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error });
  }
};

// Reset mật khẩu
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    db.query(
      "SELECT * FROM users WHERE reset_token = ? AND reset_token_expire > NOW()",
      [token],
      async (err, results) => {
        if (err) return res.status(500).json({ message: "Lỗi server", err });

        if (results.length === 0) {
          return res.status(400).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
        }

        const user = results[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        db.query(
          "UPDATE users SET password = ?, reset_token = NULL, reset_token_expire = NULL WHERE id = ?",
          [hashedPassword, user.id],
          (updateErr) => {
            if (updateErr) {
              return res.status(500).json({ message: "Lỗi server", updateErr });
            }

            res.json({ message: "Đặt lại mật khẩu thành công" });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error });
  }
};

// Google callback success
const googleSuccess = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Google login thất bại" });
  }

  // Đề phòng thư viện Passport không lấy role, ta chọc thẳng vào DB tìm email cho chắc cú!
  db.query("SELECT * FROM users WHERE email = ?", [req.user.email], (err, results) => {
    if (err || results.length === 0) {
      return res.redirect(`http://localhost:5173/login?error=true`);
    }

    // Lấy thông tin user chuẩn 100% từ Database (lúc này chắc chắn có role)
    const dbUser = results[0];
    
    // Tạo token dựa trên dbUser
    const token = generateToken(dbUser);

    // Tạo object chứa thông tin cần thiết
    const userData = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role // Bây giờ chắc chắn 100% nó sẽ mang giá trị "STORE"
    };

    // Mã hóa object này thành một chuỗi an toàn để đưa lên URL
    const encodedUser = encodeURIComponent(JSON.stringify(userData));

    // Bắn sang Frontend
    res.redirect(`http://localhost:5173/google-success?token=${token}&user=${encodedUser}`);
  });
};

const googleFailure = (req, res) => {
  res.status(401).json({ message: "Đăng nhập Google thất bại" });
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  googleSuccess,
  googleFailure
};