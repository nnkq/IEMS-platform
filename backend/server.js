const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

// Khai báo db MỘT LẦN DUY NHẤT ở đầu file
const db = require('./src/config/db');

const authRoutes = require('./src/routes/auth.routes');
const homeRoutes = require('./src/routes/home.routes');
const repairRoutes = require('./src/routes/repairRequest.routes');
const storeRoutes = require('./src/routes/storeRoutes');
const productRoutes = require('./src/routes/productRoutes');
const mapRoutes = require('./src/routes/map.routes');
const userRoutes = require('./src/routes/user.routes');
const adminRoutes = require('./src/routes/admin.routes');
const chatRoutes = require('./src/routes/chat.routes');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'iems_secret_key';

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const name = profile.displayName;
        const email = profile.emails?.[0]?.value || null;

        db.query(
          'SELECT * FROM users WHERE email = ? OR google_id = ?',
          [email, googleId],
          (err, results) => {
            if (err) return done(err);

            if (results.length > 0) {
              const user = results[0];

              db.query(
                'UPDATE users SET google_id = ? WHERE id = ?',
                [googleId, user.id],
                (updateErr) => {
                  if (updateErr) return done(updateErr);

                  return done(null, {
                    ...user,
                    google_id: googleId,
                  });
                }
              );
            } else {
              db.query(
                'INSERT INTO users (name, email, google_id, role) VALUES (?, ?, ?, ?)',
                [name, email, googleId, null],
                (insertErr, result) => {
                  if (insertErr) return done(insertErr);

                  return done(null, {
                    id: result.insertId,
                    name,
                    email,
                    google_id: googleId,
                    role: null,
                  });
                }
              );
            }
          }
        );
      } catch (error) {
        done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get('/', (req, res) => {
  res.send('IEMS API Running');
});

// ==========================================
// CÁC ROUTES CÓ SẴN CỦA BẠN
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/home', homeRoutes);
app.use('/api', repairRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

// ==========================================
// API: QUẢN LÝ NHÂN VIÊN (KỸ THUẬT VIÊN)
// ==========================================

// 1. Lấy danh sách nhân viên của cửa hàng
app.get('/api/employees/:storeId', (req, res) => {
    const storeId = req.params.storeId;
    db.query('SELECT * FROM employees WHERE store_id = ? ORDER BY id DESC', [storeId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
});

// 2. Thêm nhân viên mới
app.post('/api/employees', (req, res) => {
    const { storeId, name, specialty, phone } = req.body;
    
    // Gán cứng mật khẩu mặc định theo luồng Đồ án
    const defaultPassword = 'abc123'; 

    const sql = 'INSERT INTO employees (store_id, name, specialty, phone, password) VALUES (?, ?, ?, ?, ?)';
    
    db.query(sql, [storeId, name, specialty, phone, defaultPassword], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: result.insertId, message: 'Thêm nhân viên và cấp tài khoản thành công' });
    });
});

// 3. Xóa nhân viên
app.delete('/api/employees/:id', (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM employees WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Đã xóa nhân viên' });
    });
});

// ==========================================
// API: DÀNH RIÊNG CHO KỸ THUẬT VIÊN (TECHNICIAN)
// ==========================================

// 1. Lấy danh sách đơn được Store giao cho Thợ này
app.get('/api/technician/orders/:employeeId', (req, res) => {
    const empId = req.params.employeeId;
    db.query('SELECT * FROM repair_requests WHERE employee_id = ? ORDER BY id DESC', [empId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
});

// 2. Thợ cập nhật đơn (Nhận, Từ chối, Ghi chú bệnh thật, Báo tiền phát sinh)
app.put('/api/technician/orders/:id', (req, res) => {
    const reqId = req.params.id;
    const { status, technician_note, extra_cost } = req.body;
    
    let sql = 'UPDATE repair_requests SET ';
    const params = [];
    
    if (status) { sql += 'status = ?, '; params.push(status); }
    if (technician_note !== undefined) { sql += 'technician_note = ?, '; params.push(technician_note); }
    if (extra_cost !== undefined) { sql += 'extra_cost = ?, '; params.push(extra_cost); }
    
    sql = sql.slice(0, -2); // Xóa dấu phẩy thừa ở cuối
    sql += ' WHERE id = ?';
    params.push(reqId);

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Đã cập nhật đơn hàng thành công' });
    });
});

// 3. ĐĂNG NHẬP CHO KỸ THUẬT VIÊN (TECHNICIAN)
app.post('/api/technician/login', (req, res) => {
    const { phone, password } = req.body;
    
    // Tìm nhân viên khớp cả SĐT và Mật khẩu
    db.query('SELECT * FROM employees WHERE phone = ? AND password = ?', [phone, password], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length === 0) {
            return res.status(401).json({ message: 'Số điện thoại hoặc mật khẩu không chính xác!' });
        }
        
        const tech = results[0];
        // Đăng nhập thành công, trả về thông tin thợ
        res.status(200).json({
            message: 'Đăng nhập thành công',
            tech: {
                id: tech.id,
                name: tech.name,
                specialty: tech.specialty,
                store_id: tech.store_id,
                phone: tech.phone
            }
        });
    });
});

// ==========================================
// APP.LISTEN (LUÔN PHẢI NẰM CUỐI CÙNG - KHÔNG ĐƯỢC ĐỂ CÁI GÌ Ở DƯỚI NÀY NỮA NHÉ)
// ==========================================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});