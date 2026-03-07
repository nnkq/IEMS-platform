USE iems_db;

-- 1. Thêm status vào bảng users

ALTER TABLE users
ADD COLUMN status ENUM('ACTIVE', 'BLOCKED', 'PENDING') DEFAULT 'ACTIVE';

-- 2. Thêm rating_avg và total_reviews vào bảng stores
ALTER TABLE stores
ADD COLUMN rating_avg FLOAT DEFAULT 0,
ADD COLUMN total_reviews INT DEFAULT 0;

-- 3. Thêm user_id vào bảng orders + FK tới users(id)
ALTER TABLE orders
ADD COLUMN user_id INT,
ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id);

-- 4. Thêm payment_type vào bảng payments
ALTER TABLE payments
ADD COLUMN payment_type ENUM('DEPOSIT','FULL') DEFAULT 'FULL';

-- 5. Thêm sender_id vào bảng notifications + FK tới users(id)
ALTER TABLE notifications
ADD COLUMN sender_id INT,
ADD CONSTRAINT fk_notifications_sender FOREIGN KEY (sender_id) REFERENCES users(id);