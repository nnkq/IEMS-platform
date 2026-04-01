const db = require('./db.js');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        const adminEmail = 'admin@iems.com';
        const adminPassword = '123456';
        const adminName = 'Quản Trị Viên';

        // Check if admin already exists
        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [adminEmail]);
        if (existing.length > 0) {
            console.log('✅ Tài khoản admin đã tồn tại!');
            console.log('📧 Email   :', adminEmail);
            console.log('🔑 Mật khẩu: 123456');
            process.exit(0);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Insert admin
        await db.query(
            `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'ADMIN')`,
            [adminName, adminEmail, hashedPassword]
        );

        console.log('🎉 Tạo tài khoản admin thành công!');
        console.log('----------------------------------------');
        console.log('📧 Email   :', adminEmail);
        console.log('🔑 Mật khẩu: 123456 (đã hash)');
        console.log('👤 Tên     :', adminName);
        console.log('🔐 Role    : ADMIN');
        console.log('----------------------------------------');

    } catch (err) {
        console.error('❌ Lỗi khi tạo admin:', err.message);
    } finally {
        process.exit(0);
    }
}

createAdmin();
