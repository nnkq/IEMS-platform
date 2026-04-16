const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const http = require('http');

require('dotenv').config();

// Khai báo db MỘT LẦN DUY NHẤT ở đầu file
const db = require('./src/config/db');
const { initSocket } = require('./src/socket');

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
const server = http.createServer(app);

const PORT = Number(process.env.PORT || 5000);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const SESSION_SECRET =
  process.env.SESSION_SECRET || process.env.JWT_SECRET || 'iems_secret_key';

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

  db.query(
    'SELECT * FROM employees WHERE store_id = ? ORDER BY id DESC',
    [storeId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(200).json(results);
    }
  );
});

// 2. Thêm nhân viên mới
app.post('/api/employees', (req, res) => {
  const { storeId, name, specialty, phone } = req.body;

  // Gán cứng mật khẩu mặc định theo luồng Đồ án
  const defaultPassword = 'abc123';

  const sql =
    'INSERT INTO employees (store_id, name, specialty, phone, password) VALUES (?, ?, ?, ?, ?)';

  db.query(
    sql,
    [storeId, name, specialty, phone, defaultPassword],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({
        id: result.insertId,
        message: 'Thêm nhân viên và cấp tài khoản thành công',
      });
    }
  );
});

// 3. Xóa nhân viên
app.delete('/api/employees/:id', (req, res) => {
  const id = req.params.id;

  db.query('DELETE FROM employees WHERE id = ?', [id], (err) => {
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
  const sql = `
    SELECT
      rr.*,
      q.id AS quote_id,
      q.price AS quote_price,
      q.message AS quote_message,
      q.estimated_time AS quote_estimated_time,
      q.status AS quote_status,
      q.created_at AS quote_created_at
    FROM repair_requests rr
    LEFT JOIN quotes q ON q.id = (
      SELECT q2.id
      FROM quotes q2
      WHERE q2.request_id = rr.id
      ORDER BY q2.id DESC
      LIMIT 1
    )
    WHERE rr.employee_id = ?
    ORDER BY rr.id DESC
  `;

  db.query(sql, [empId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(results);
  });
});

// 2. Thợ cập nhật đơn (ghi chú tình trạng, báo giá, hoàn thành)
app.put('/api/technician/orders/:id', async (req, res) => {
  const reqId = req.params.id;
  const { status, technician_note, quote_price, estimated_time, quote_message } =
    req.body;

  try {
    const [requestRows] = await db.promise().query(
      'SELECT id, user_id, store_id, status FROM repair_requests WHERE id = ? LIMIT 1',
      [reqId]
    );

    if (!requestRows.length) {
      return res.status(404).json({ error: 'Không tìm thấy yêu cầu sửa chữa' });
    }

    const requestRow = requestRows[0];
    const nextStatus = status || requestRow.status;
    const noteValue = technician_note !== undefined ? technician_note : null;

    await db.promise().query(
      'UPDATE repair_requests SET status = ?, technician_note = COALESCE(?, technician_note) WHERE id = ?',
      [nextStatus, noteValue, reqId]
    );

    if (nextStatus === 'QUOTED') {
      if (!quote_price) {
        return res.status(400).json({ error: 'Thiếu giá báo cho khách hàng' });
      }

      const [latestQuotes] = await db.promise().query(
        'SELECT id, status FROM quotes WHERE request_id = ? ORDER BY id DESC LIMIT 1',
        [reqId]
      );

      if (latestQuotes.length > 0 && latestQuotes[0].status === 'PENDING') {
        await db.promise().query(
          'UPDATE quotes SET price = ?, message = ?, estimated_time = ?, status = "PENDING" WHERE id = ?',
          [
            quote_price,
            quote_message || technician_note || '',
            estimated_time || null,
            latestQuotes[0].id,
          ]
        );
      } else {
        await db.promise().query(
          'INSERT INTO quotes (request_id, store_id, price, message, estimated_time, status) VALUES (?, ?, ?, ?, ?, "PENDING")',
          [
            reqId,
            requestRow.store_id || null,
            quote_price,
            quote_message || technician_note || '',
            estimated_time || null,
          ]
        );
      }

      if (requestRow.user_id) {
        await db.promise().query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, "SYSTEM")',
          [
            requestRow.user_id,
            'Đã có báo giá mới',
            `Yêu cầu #RQ-${reqId} đã được kỹ thuật viên kiểm tra và gửi báo giá. Vui lòng vào mục Theo dõi để phản hồi.`,
          ]
        );
      }
    }

    if (nextStatus === 'WAITING_STORE_CONFIRM') {
      const [storeRows] = await db.promise().query(
        'SELECT user_id, store_name FROM stores WHERE id = ? LIMIT 1',
        [requestRow.store_id]
      );

      if (storeRows.length > 0 && storeRows[0].user_id) {
        await db.promise().query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, "SYSTEM")',
          [
            storeRows[0].user_id,
            'Kỹ thuật viên đã sửa xong',
            `Yêu cầu #RQ-${reqId} đã được kỹ thuật viên báo sửa xong. Vui lòng kiểm tra và xác nhận hoàn thành để gửi cho khách hàng.`,
          ]
        );
      }
    }

    res.status(200).json({ message: 'Đã cập nhật đơn hàng thành công' });
  } catch (err) {
    console.error('Technician update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. ĐĂNG NHẬP CHO KỸ THUẬT VIÊN (TECHNICIAN)
app.post('/api/technician/login', (req, res) => {
  const { phone, password } = req.body;

  db.query(
    'SELECT * FROM employees WHERE phone = ? AND password = ?',
    [phone, password],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0) {
        return res
          .status(401)
          .json({ message: 'Số điện thoại hoặc mật khẩu không chính xác!' });
      }

      const tech = results[0];

      res.status(200).json({
        message: 'Đăng nhập thành công',
        tech: {
          id: tech.id,
          name: tech.name,
          specialty: tech.specialty,
          store_id: tech.store_id,
          phone: tech.phone,
        },
      });
    }
  );
});

// ==========================================
// SOCKET REALTIME CHAT
// ==========================================
initSocket(server, CLIENT_URL);

// ==========================================
// SERVER LISTEN
// ==========================================
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});