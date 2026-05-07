require('dotenv').config();
const db = require('./src/config/db.js');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        const adminEmail = 'admin@iems.com';
        const adminPassword = '123456';
        const adminName = 'Quản Trị Viên';

        console.log('⏳ Đang kết nối database...');

        // Check if admin already exists
        // Sử dụng db.promise() vì kết nối mysql2 mặc định là callback-based
        const [existing] = await db.promise().query('SELECT * FROM users WHERE email = ?', [adminEmail]);

        // Hash password
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        if (existing.length > 0) {
            // Update existing admin password
            await db.promise().query(
                `UPDATE users SET password = ?, name = ?, role = 'ADMIN' WHERE email = ?`,
                [hashedPassword, adminName, adminEmail]
            );
            console.log('✅ Đã cập nhật lại (reset) tài khoản admin!');
        } else {
            // Insert admin
            await db.promise().query(
                `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'ADMIN')`,
                [adminName, adminEmail, hashedPassword]
            );
            console.log('🎉 Tạo tài khoản admin mới thành công!');
        }

        console.log('----------------------------------------');
        console.log('📧 Email   :', adminEmail);
        console.log('🔑 Mật khẩu: 123456');
        console.log('👤 Tên     :', adminName);
        console.log('🔐 Role    : ADMIN');
        console.log('----------------------------------------');

    } catch (err) {
        console.error('❌ Lỗi khi tạo admin:', err.message);
    } finally {
        // Đóng kết nối để script kết thúc
        db.end();
    }
}

createAdmin();

// BẬT TERMINAL NHẬP "node create_acc_admin.js " để tạo tài khoản admin